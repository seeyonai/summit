import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { parseFile } from 'music-metadata';
import meetingService from '../../services/MeetingService';
import transcriptExtractionService from '../../services/TranscriptExtractionService';
import transcriptChatService from '../../services/TranscriptChatService';
import { MeetingCreate, MeetingUpdate, Recording, Meeting, RecordingResponse } from '../../types';
import recordingService from '../../services/RecordingService';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest, notFound, internal } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { requireMemberOrOwner, requireOwner, requireViewerOrMemberOrOwner } from '../../middleware/auth';
import { getPreferredLang } from '../../utils/lang';
import { debug } from '../../utils/logger';
import { setAuditContext } from '../../middleware/audit';
import { getFilesBaseDir } from '../../utils/filePaths';
import { decryptFileToTempPath, writeEncryptedFile } from '../../utils/audioEncryption';
import { buildRecordingFilename, findRecordingFilePath } from '../../utils/recordingHelpers';
import { createChatCompletion } from '../../utils/openai';

const router = Router();

const recordingsBaseDir = getFilesBaseDir();

const escapePathForFfmpeg = (input: string): string => input.replace(/'/g, "'\\''");

const runProcess = (command: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
      } else {
        resolve();
      }
    });
  });

const sanitizeFileName = (input: string): string =>
  input
    .normalize('NFKC')
    .replace(/[\s]+/g, '_')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'meeting';

const buildConcatenatedFileName = (title: string | undefined, extension: string = 'wav'): string => {
  const base = sanitizeFileName(title || 'meeting');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${base}-拼接录音-${timestamp}.${extension}`;
};

const responseToRecording = (response: RecordingResponse, meetingId: string): Recording => ({
  _id: new ObjectId(response._id),
  originalFileName: response.originalFileName,
  createdAt: new Date(response.createdAt),
  updatedAt: response.updatedAt ? new Date(response.updatedAt) : undefined,
  duration: response.duration,
  fileSize: response.fileSize,
  transcription: response.transcription,
  verbatimTranscript: response.verbatimTranscript,
  speakerSegments: response.speakerSegments,
  timeStampedNotes: response.timeStampedNotes,
  alignmentItems: response.alignmentItems,
  numSpeakers: response.numSpeakers,
  sampleRate: response.sampleRate,
  channels: response.channels,
  format: response.format,
  source: response.source || 'concatenated',
  hotwords: response.hotwords,
  organizedSpeeches: response.organizedSpeeches,
  meetingId: response.meetingId && ObjectId.isValid(response.meetingId) ? new ObjectId(response.meetingId) : new ObjectId(meetingId),
  ownerId: response.ownerId && ObjectId.isValid(response.ownerId) ? new ObjectId(response.ownerId) : undefined,
});

const toIsoString = (value?: Date | string): string | undefined => {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const serializeRecording = (recording: Recording) => ({
  ...recording,
  _id: recording._id.toString(),
  createdAt: toIsoString(recording.createdAt),
  updatedAt: toIsoString(recording.updatedAt),
});

const serializeMeeting = (meeting: Meeting) => ({
  ...meeting,
  _id: meeting._id.toString(),
  createdAt: toIsoString(meeting.createdAt),
  updatedAt: toIsoString(meeting.updatedAt),
  scheduledStart: toIsoString(meeting.scheduledStart),
  recordings: meeting.recordings?.map(serializeRecording) || [],
  concatenatedRecording: meeting.concatenatedRecording ? serializeRecording(meeting.concatenatedRecording) : undefined,
  ownerId: meeting.ownerId ? meeting.ownerId.toString() : undefined,
  members: Array.isArray(meeting.members) ? meeting.members.map((member) => member.toString()) : [],
  viewers: Array.isArray(meeting.viewers) ? meeting.viewers.map((viewer) => viewer.toString()) : [],
  recordingOrder: Array.isArray(meeting.recordingOrder)
    ? meeting.recordingOrder
        .map((entry) => ({
          recordingId: entry.recordingId.toString(),
          index: entry.index,
          enabled: entry.enabled !== false,
        }))
        .sort((a, b) => a.index - b.index)
    : undefined,
});

// (Removed meetings-specific health check; root /health covers this)

// Get meetings for current user (owner or member)
// Get meetings for current user (default limit 100; use ?all=true to fetch all)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const r = req as RequestWithUser;
    const userId = r.user?.userId;
    if (!userId) {
      throw badRequest('Unauthorized', 'auth.unauthorized');
    }
    const all = typeof req.query.all === 'string' && ['true', '1', 'yes'].includes(req.query.all.toLowerCase());
    const desired = all ? 'all' : 101;
    const list = r.user?.role === 'admin' ? await meetingService.getAllMeetings(desired) : await meetingService.getMeetingsForUser(userId, desired);
    const overLimit = !all && list.length > 100;
    const meetings = overLimit ? list.slice(0, 100) : list;
    const fetchedAll = all || !overLimit;
    res.json({ meetings: meetings.map(serializeMeeting), fetchedAll });
  })
);

// Get meeting by ID (owner, member, or viewer)
router.get(
  '/:id',
  requireViewerOrMemberOrOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      throw badRequest('Invalid meeting id', 'meeting.invalid_id');
    }
    const meeting = await meetingService.getMeetingById(id);

    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
    }

    const recordings = await recordingService.getRecordingsByMeetingId(id, false);
    res.json({
      ...meeting,
      recordings,
    });
  })
);

// Create new private meeting (owner = current user)
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const request: MeetingCreate = req.body;

    if (!request?.title) {
      throw badRequest('Title is required', 'meeting.title_required');
    }

    const r = req as RequestWithUser;
    const userId = r.user?.userId;
    if (!userId) {
      throw badRequest('Unauthorized', 'auth.unauthorized');
    }
    const meeting = await meetingService.createMeeting(request, userId);
    setAuditContext(res, {
      action: 'meeting_create',
      resource: 'meeting',
      resourceId: meeting._id.toString(),
      status: 'success',
      details: { ownerId: userId },
    });
    res.status(201).json(serializeMeeting(meeting));
  })
);

// Update meeting
router.put(
  '/:id',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const request: MeetingUpdate = req.body;

    const meeting = await meetingService.updateMeeting(id, request);

    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
    }

    setAuditContext(res, {
      action: 'meeting_update',
      resource: 'meeting',
      resourceId: id,
      status: 'success',
    });
    res.json(serializeMeeting(meeting));
  })
);

// Delete meeting
router.delete(
  '/:id',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await meetingService.deleteMeeting(id);

    if (!deleted) {
      throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
    }

    const lang = getPreferredLang(req);
    setAuditContext(res, {
      action: 'meeting_delete',
      resource: 'meeting',
      resourceId: id,
      status: 'success',
    });
    res.json({ message: lang === 'en' ? 'Meeting deleted successfully' : '会议删除成功' });
  })
);

// Add recording to meeting
router.post(
  '/:id/recordings',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { recordingId } = req.body as { recordingId?: string };

    if (!recordingId) {
      throw badRequest('recordingId is required', 'recording.id_required');
    }

    const meeting = await recordingService.addRecordingToMeeting(id, recordingId);
    setAuditContext(res, {
      action: 'meeting_add_recording',
      resource: 'meeting',
      resourceId: id,
      status: 'success',
      details: { recordingId },
    });

    res.json(meeting);
  })
);

// Remove recording from meeting
router.delete(
  '/:id/recordings/:recordingId',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, recordingId } = req.params;
    const meeting = await meetingService.removeRecordingFromMeeting(id, recordingId);

    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
    }

    setAuditContext(res, {
      action: 'meeting_remove_recording',
      resource: 'meeting',
      resourceId: id,
      status: 'success',
      details: { recordingId },
    });
    res.json(serializeMeeting(meeting));
  })
);

// Get meetings by status
router.get(
  '/status/:status',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.params;
    // NOTE: Filter by status then by access is done on service side currently for all; here we reuse list for user and filter.
    const r = req as RequestWithUser;
    const userId = r.user?.userId;
    if (!userId) {
      throw badRequest('Unauthorized', 'auth.unauthorized');
    }
    const base = r.user?.role === 'admin' ? await meetingService.getAllMeetings('all') : await meetingService.getMeetingsForUser(userId, 'all');
    const meetings = base.filter((m) => m.status === status);
    res.json(meetings.map(serializeMeeting));
  })
);

// Get upcoming meetings
router.get(
  '/upcoming',
  asyncHandler(async (req: Request, res: Response) => {
    const r = req as RequestWithUser;
    const userId = r.user?.userId;
    if (!userId) {
      throw badRequest('Unauthorized', 'auth.unauthorized');
    }
    const meetings = await meetingService.getUpcomingMeetings();
    if (r.user?.role === 'admin') {
      res.json(meetings.map(serializeMeeting));
      return;
    }
    const accessible = new Set((await meetingService.getMeetingsForUser(userId, 'all')).map((m) => m._id.toString()));
    res.json(meetings.filter((m) => accessible.has(m._id.toString())).map(serializeMeeting));
  })
);

// Generate verbatim transcript for a recording
router.post(
  '/:meetingId/recordings/:recordingId/verbatim',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId, recordingId } = req.params;

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
    }

    const recordings = await recordingService.getRecordingsByMeetingId(meetingId);
    const recording = recordings.find((r) => r._id.toString() === recordingId);
    if (!recording) {
      throw notFound('Recording not found', 'recording.not_found');
    }

    if (!recording.transcription) {
      throw badRequest('Recording must have transcription first', 'recording.transcription_required');
    }

    recording.verbatimTranscript = `[逐字稿 - 待实现]\n原始转录: ${recording.transcription}\n\n这里将会生成包含语气词、停顿、重复等原始语音特征的逐字稿。`;

    const updatedMeeting = await meetingService.updateMeeting(meetingId, {});

    {
      const lang = getPreferredLang(req);
      res.json({
        success: true,
        verbatimTranscript: recording.verbatimTranscript,
        message: lang === 'en' ? 'Verbatim transcript generated' : '逐字稿生成成功',
        meeting: updatedMeeting ? serializeMeeting(updatedMeeting) : null,
      });
    }
  })
);

// Generate final polished transcript for meeting
router.post(
  '/:meetingId/final-transcript',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const { instruction } = req.body as { instruction?: string };
    const lang = getPreferredLang(req);

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
    }

    const recordings = await recordingService.getRecordingsByMeetingId(meetingId);

    // Build speaker name map from all recordings
    const speakerNameMap: Record<number, string> = {};
    for (const r of recordings) {
      if (Array.isArray(r.speakerNames)) {
        for (const sn of r.speakerNames) {
          if (typeof sn.index === 'number' && sn.name?.trim()) {
            speakerNameMap[sn.index] = sn.name.trim();
          }
        }
      }
    }

    const getSpeakerLabel = (index: number): string => speakerNameMap[index] || `发言人 ${index + 1}`;

    // Collect organized speeches with speaker names
    const allOrganizedSpeeches: Array<{
      speaker: string;
      startTime: number;
      endTime: number;
      text: string;
    }> = [];

    let timeOffset = 0;
    for (const r of recordings) {
      if (Array.isArray(r.organizedSpeeches)) {
        for (const speech of r.organizedSpeeches) {
          allOrganizedSpeeches.push({
            speaker: getSpeakerLabel(speech.speakerIndex),
            startTime: speech.startTime + timeOffset,
            endTime: speech.endTime + timeOffset,
            text: speech.polishedText || speech.rawText,
          });
        }
      }
      timeOffset += r.duration || 0;
    }
    allOrganizedSpeeches.sort((a, b) => a.startTime - b.startTime);

    // Collect raw transcripts as fallback
    const transcripts = recordings
      .filter((r: RecordingResponse) => r.transcription)
      .map((r: RecordingResponse) => r.transcription)
      .filter(Boolean);

    if (transcripts.length === 0 && allOrganizedSpeeches.length === 0) {
      throw badRequest(lang === 'en' ? 'No transcriptions available for this meeting' : '此会议没有可用的转录文本', 'meeting.no_transcriptions');
    }

    // Build input content for AI
    let inputContent = '';
    if (allOrganizedSpeeches.length > 0) {
      const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };
      inputContent = allOrganizedSpeeches.map((s) => `[${formatTime(s.startTime)}] ${s.speaker}: ${s.text}`).join('\n');
    } else {
      inputContent = transcripts.join('\n\n');
    }

    // Generate polished transcript using AI
    let systemPrompt = `你是一位专业的会议纪要撰写专家。请根据提供的会议录音转录内容，生成一份结构清晰、内容完整的会议纪要。

要求：
1. 使用 Markdown 格式输出
2. 包含以下结构：会议标题、会议概要、主要讨论内容、发言摘要、后续行动项
3. 保留原始内容中的重要信息和细节，不要遗漏关键点
4. 如果有发言人标注，请在发言摘要中保留发言人信息
5. 语言流畅，表达专业
6. 不要编造内容，仅基于提供的转录内容进行整理`;

    if (instruction?.trim()) {
      systemPrompt += `\n\n用户额外要求：${instruction.trim()}`;
    }

    const userPrompt = `会议标题：${meeting.title}
${meeting.summary ? `会议简介：${meeting.summary}\n` : ''}
---
转录内容：
${inputContent}`;

    let finalTranscript: string;
    try {
      const completion = await createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      });
      finalTranscript = completion.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
      debug('AI transcript generation failed, using fallback', err);
      finalTranscript = '';
    }

    // Fallback to simple template if AI fails
    if (!finalTranscript) {
      const speakerSection =
        allOrganizedSpeeches.length > 0 ? allOrganizedSpeeches.map((s) => `- **${s.speaker}**: ${s.text}`).join('\n') : transcripts.join('\n\n');

      finalTranscript = `# 会议纪要 - ${meeting.title}

## 会议概要
${meeting.summary || '本次会议主要讨论了相关议题，参会人员进行了深入的交流和讨论。'}

## 发言记录
${speakerSection}

---
*此纪要由系统自动生成，仅供参考。*`;
    }

    await meetingService.updateMeeting(meetingId, { finalTranscript });

    res.json({
      success: true,
      finalTranscript,
      message: lang === 'en' ? 'Final transcript generated' : '最终纪要生成成功',
    });
  })
);

// Update final transcript for meeting
router.put(
  '/:meetingId/final-transcript',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const { finalTranscript } = req.body as { finalTranscript?: string };

    // Validate required fields
    if (!finalTranscript || typeof finalTranscript !== 'string') {
      throw badRequest('Final transcript content is required and must be a string', 'meeting.transcript_content_required');
    }

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
    }

    const updatedMeeting = await meetingService.updateMeeting(meetingId, {
      finalTranscript: finalTranscript.trim(),
    });

    if (!updatedMeeting) {
      throw notFound(`Failed to update meeting (ID: ${meetingId})`, 'meeting.update_failed');
    }

    const lang = getPreferredLang(req);
    res.json({
      success: true,
      finalTranscript: updatedMeeting.finalTranscript,
      message: lang === 'en' ? 'Transcript updated successfully' : '会议转录更新成功',
      meeting: serializeMeeting(updatedMeeting),
    });
  })
);

// Generate AI advice for a todo item
router.post(
  '/:meetingId/todo-advice',
  requireMemberOrOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const { todoText } = req.body as { todoText?: string };

    if (!todoText) {
      throw badRequest('Todo text is required', 'todo.text_required');
    }

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
    }

    const advice = `针对任务 "${todoText}" 的AI建议：
    
1. 建议的具体步骤
   - 首先，明确任务的目标和预期结果
   - 其次，制定详细的执行计划
   - 最后，设定里程碑和检查点

2. 可能遇到的挑战
   - 时间管理问题
   - 资源不足
   - 团队协作障碍

3. 解决方案推荐
   - 使用项目管理工具跟踪进度
   - 定期与相关人员沟通
   - 寻求必要的支持和资源

4. 时间安排建议
   - 建议在3-5个工作日内完成
   - 每天分配1-2小时专门处理此任务
   - 预留时间用于意外情况处理`;

    {
      const lang = getPreferredLang(req);
      res.json({
        success: true,
        advice,
        message: lang === 'en' ? 'AI suggestion generated' : 'AI建议生成成功',
      });
    }
  })
);

// Extract disputed issues and todos from meeting transcript (SSE streaming)
router.post(
  '/:meetingId/extract-analysis',
  requireMemberOrOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params;

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
    }

    let transcript = meeting.finalTranscript;

    if (!transcript) {
      try {
        transcript = await transcriptExtractionService.buildTranscriptFromOrganizedSpeeches(meetingId);
        debug('Built transcript from organized speeches for analysis');
      } catch (error) {
        debug('Could not build transcript from organized speeches:', error);
        throw badRequest(
          'Meeting must have a final transcript or organized speeches from recordings before analysis can be performed',
          'meeting.transcript_required'
        );
      }
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    const sendEvent = (event: string, data: any) => {
      if (aborted) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const extractionResult = await transcriptExtractionService.extractFromTranscript(transcript, (progressEvent) => {
        if (aborted) return;
        sendEvent('progress', {
          stage: progressEvent.stage,
          chunkIndex: progressEvent.chunkIndex,
          chunkCount: progressEvent.chunkCount,
          status: progressEvent.status,
        });
      });

      if (aborted) {
        res.end();
        return;
      }

      const formattedAnalysis = transcriptExtractionService.formatExtractionForMeeting(extractionResult);

      const updateData: any = {
        _id: meeting._id,
        disputedIssues: formattedAnalysis.disputedIssues,
        todos: formattedAnalysis.todos,
      };

      if (!meeting.finalTranscript && transcript) {
        updateData.finalTranscript = transcript;
      }

      await meetingService.updateMeeting(meetingId, updateData);

      sendEvent('done', {
        success: true,
        data: {
          disputedIssues: formattedAnalysis.disputedIssues,
          todos: formattedAnalysis.todos,
          metadata: formattedAnalysis.metadata,
        },
        message: '转录分析完成',
      });
    } catch (error) {
      if (!aborted) {
        let errorMessage = 'Failed to extract analysis from transcript';
        if (error instanceof Error) {
          if (error.message.includes('OPENAI_API_KEY')) {
            errorMessage = 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.';
          } else if (error.message.includes('Transcript text is required')) {
            errorMessage = error.message;
          }
        }
        sendEvent('error', { message: errorMessage });
      }
    } finally {
      res.end();
    }
  })
);

// Generate suggested questions for chat
router.get(
  '/:id/chat/suggested-questions',
  requireMemberOrOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: meetingId } = req.params as { id: string };

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound('Meeting not found', 'meeting.not_found');
    }

    let transcript = meeting.finalTranscript;
    if (!transcript) {
      try {
        transcript = await transcriptExtractionService.buildTranscriptFromOrganizedSpeeches(meetingId);
      } catch (error) {
        throw badRequest('Meeting must have a final transcript or organized speeches before questions can be generated', 'chat.transcript_required');
      }
    }

    try {
      const questions = await transcriptChatService.generateSuggestedQuestions(transcript, meeting.title);
      res.json({ success: true, questions });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('OPENAI_API_KEY')) {
          throw internal('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.', 'chat.missing_api_key');
        }
      }

      throw internal('Failed to generate suggested questions', 'chat.failed', error instanceof Error ? error.message : error);
    }
  })
);

// Chat with transcript using streaming
router.post(
  '/:id/chat',
  requireMemberOrOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: meetingId } = req.params as { id: string };
    const { message, history } = req.body as { message?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw badRequest('Message is required', 'chat.message_required');
    }

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound('Meeting not found', 'meeting.not_found');
    }

    let transcript = meeting.finalTranscript;
    if (!transcript) {
      try {
        transcript = await transcriptExtractionService.buildTranscriptFromOrganizedSpeeches(meetingId);
      } catch (error) {
        throw badRequest('Meeting must have a final transcript or organized speeches before chat can be used', 'chat.transcript_required');
      }
    }

    try {
      const chatHistory = Array.isArray(history) ? history : [];
      const stream = await transcriptChatService.chatStream(transcript, message.trim(), chatHistory);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('OPENAI_API_KEY')) {
          throw internal('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.', 'chat.missing_api_key');
        }
      }

      throw internal('Failed to process chat request', 'chat.failed', error instanceof Error ? error.message : error);
    }
  })
);

// Concatenate meeting recordings into a single file
router.post(
  '/:meetingId/concatenate-recordings',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { meetingId } = req.params as { meetingId: string };

    if (!ObjectId.isValid(meetingId)) {
      throw badRequest('Invalid meeting id', 'meeting.invalid_id');
    }

    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
    }

    const recordings = await recordingService.getRecordingsByMeetingId(meetingId, false);
    if (!Array.isArray(recordings) || recordings.length === 0) {
      throw badRequest('No recordings available to concatenate', 'meeting.concatenate_no_recordings');
    }

    const body = (req.body || {}) as { recordingIds?: unknown };
    const requestedIds = Array.isArray(body.recordingIds)
      ? body.recordingIds.map((value) => (typeof value === 'string' ? value : String(value || '')).trim()).filter((value) => value.length > 0)
      : [];

    const recordingsMap = new Map(recordings.map((record) => [record._id, record]));
    const orderEntries = Array.isArray(meeting.recordingOrder)
      ? meeting.recordingOrder
          .filter((entry) => entry && entry.enabled !== false)
          .sort((a, b) => a.index - b.index)
          .map((entry) => entry.recordingId.toString())
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];

    const ordered: RecordingResponse[] = [];
    const seen = new Set<string>();

    orderEntries.forEach((id) => {
      const record = recordingsMap.get(id);
      if (record && record.source !== 'concatenated' && !seen.has(id)) {
        ordered.push(record);
        seen.add(id);
      }
    });

    recordings.forEach((record) => {
      if (record.source === 'concatenated') {
        return;
      }
      if (!seen.has(record._id)) {
        ordered.push(record);
        seen.add(record._id);
      }
    });

    let targets: RecordingResponse[] = ordered;

    if (requestedIds.length > 0) {
      const missing: string[] = [];
      const deduped = new Set<string>();
      targets = requestedIds
        .map((id) => {
          const record = recordingsMap.get(id);
          if (!record || record.source === 'concatenated') {
            missing.push(id);
            return null;
          }
          if (deduped.has(record._id)) {
            return null;
          }
          deduped.add(record._id);
          return record;
        })
        .filter((value): value is RecordingResponse => value !== null);

      if (missing.length > 0) {
        throw badRequest('One or more recordings not found for concatenation', 'meeting.concatenate_missing_recording');
      }
    }

    if (targets.length === 0) {
      throw badRequest('No recordings selected for concatenation', 'meeting.concatenate_no_targets');
    }

    const fallbackDuration = targets.reduce((total, record) => total + (record.duration || 0), 0);

    const resolvedFiles: Array<{ record: RecordingResponse; path: string }> = [];
    for (const record of targets) {
      const recordId = record._id;
      const absolutePath = await findRecordingFilePath(recordingsBaseDir, recordId, record.format || undefined);
      if (!absolutePath) {
        throw notFound(`Audio file not found for recording ${record._id}`, 'meeting.concatenate_missing_file');
      }
      resolvedFiles.push({ record, path: absolutePath });
    }

    const decryptedFiles: Array<{ record: RecordingResponse; path: string; cleanup: () => Promise<void> }> = [];

    try {
      for (const item of resolvedFiles) {
        const { tempPath, cleanup } = await decryptFileToTempPath(item.path);
        decryptedFiles.push({ record: item.record, path: tempPath, cleanup });
      }

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-concatenate-'));
      const listPath = path.join(tempDir, 'inputs.txt');
      const outputPath = path.join(tempDir, 'concatenated.wav');

      try {
        const normalizedFiles: Array<{ record: RecordingResponse; path: string }> = [];

        for (const [index, item] of decryptedFiles.entries()) {
          const normalizedPath = path.join(tempDir, `normalized-${index}.wav`);
          const args = ['-y', '-i', item.path, '-c:a', 'pcm_s16le', '-ar', '16000', '-ac', '1', normalizedPath];
          await runProcess('ffmpeg', args);
          normalizedFiles.push({ record: item.record, path: normalizedPath });
        }

        if (normalizedFiles.length === 1) {
          await fs.rm(outputPath, { force: true }).catch(() => undefined);
          await fs.rename(normalizedFiles[0].path, outputPath);
        } else {
          const listContent = normalizedFiles.map((item) => `file '${escapePathForFfmpeg(item.path)}'`).join('\n');
          await fs.writeFile(listPath, `${listContent}\n`, 'utf8');
          const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'pcm_s16le', '-ar', '16000', '-ac', '1', outputPath];
          await runProcess('ffmpeg', args);
        }

        const stats = await fs.stat(outputPath);
        const metadata = await parseFile(outputPath).catch(() => null);
        const duration =
          metadata?.format?.duration && Number.isFinite(metadata.format.duration) ? Number(metadata.format.duration) : fallbackDuration;
        const sampleRate =
          metadata?.format?.sampleRate && Number.isFinite(metadata.format.sampleRate) ? Number(metadata.format.sampleRate) : undefined;
        const channels =
          metadata?.format?.numberOfChannels && Number.isFinite(metadata.format.numberOfChannels)
            ? Number(metadata.format.numberOfChannels)
            : undefined;

        let ownerId: string | undefined = meeting.ownerId instanceof ObjectId ? meeting.ownerId.toHexString() : undefined;
        if (!ownerId && meeting.ownerId) {
          const candidate = meeting.ownerId.toString();
          ownerId = ObjectId.isValid(candidate) ? candidate : undefined;
        }
        if (!ownerId) {
          const firstOwned = targets.find((record) => record.ownerId)?.ownerId;
          ownerId = typeof firstOwned === 'string' && ObjectId.isValid(firstOwned) ? firstOwned : undefined;
        }

        if (!ownerId) {
          throw badRequest('Cannot determine owner for concatenated recording', 'meeting.concatenate_missing_owner');
        }

        const originalFileName = buildConcatenatedFileName(meeting.title, 'wav');

        const newRecording = await recordingService.createRecording({
          originalFileName,
          fileSize: stats.size,
          format: 'wav',
          mimeType: 'audio/wav',
          createdAt: new Date(),
          duration,
          sampleRate: sampleRate || 16000,
          channels: channels || 1,
          ownerId,
          meetingId,
          source: 'concatenated',
        });

        const finalFilename = buildRecordingFilename(newRecording._id.toString(), 'wav');
        const finalPath = path.join(recordingsBaseDir, finalFilename);

        await fs.rm(finalPath, { force: true }).catch(() => undefined);
        const outputBuffer = await fs.readFile(outputPath);
        await writeEncryptedFile(finalPath, outputBuffer);
        await fs.rm(outputPath, { force: true }).catch(() => undefined);

        const concatenatedRecording = responseToRecording(
          {
            ...newRecording,
            source: newRecording.source || 'concatenated',
            meetingId,
            ownerId,
          },
          meetingId
        );

        const updatedMeeting = await meetingService.updateConcatenatedRecording(meetingId, concatenatedRecording);

        if (meeting.concatenatedRecording && meeting.concatenatedRecording._id) {
          const previousId = meeting.concatenatedRecording._id.toString();
          if (previousId !== newRecording._id) {
            await recordingService.deleteRecording(previousId).catch((error) => {
              debug('Failed to remove previous concatenated recording', error);
            });
          }
        }

        const refreshedMeeting = await meetingService.getMeetingById(meetingId);
        const lang = getPreferredLang(req);
        res.json({
          success: true,
          message: lang === 'en' ? 'Concatenated recording generated' : '拼接录音已生成',
          recording: serializeRecording(concatenatedRecording),
          meeting: refreshedMeeting ? serializeMeeting(refreshedMeeting) : updatedMeeting ? serializeMeeting(updatedMeeting) : null,
        });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    } finally {
      await Promise.allSettled(decryptedFiles.map((item) => item.cleanup()));
    }
  })
);

// Member management (owner or admin)
router.post(
  '/:id/members',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      throw badRequest('userId is required', 'meeting.member_required');
    }
    const updated = await meetingService.addMember(id, userId);
    if (!updated) {
      throw notFound('Meeting not found', 'meeting.not_found');
    }
    res.json(serializeMeeting(updated));
  })
);

router.delete(
  '/:id/members/:userId',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const updated = await meetingService.removeMember(id, userId);
    if (!updated) {
      throw notFound('Meeting not found', 'meeting.not_found');
    }
    res.json(serializeMeeting(updated));
  })
);

// Viewer management (owner or admin)
router.post(
  '/:id/viewers',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      throw badRequest('userId is required', 'meeting.viewer_required');
    }
    const updated = await meetingService.addViewer(id, userId);
    if (!updated) {
      throw notFound('Meeting not found', 'meeting.not_found');
    }
    res.json(serializeMeeting(updated));
  })
);

router.delete(
  '/:id/viewers/:userId',
  requireOwner(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const updated = await meetingService.removeViewer(id, userId);
    if (!updated) {
      throw notFound('Meeting not found', 'meeting.not_found');
    }
    res.json(serializeMeeting(updated));
  })
);

export default router;
