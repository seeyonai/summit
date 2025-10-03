import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { parseFile } from 'music-metadata';
import meetingService from '../../services/MeetingService';
import transcriptExtractionService from '../../services/TranscriptExtractionService';
import { MeetingCreate, MeetingUpdate, Recording, Meeting, RecordingResponse } from '../../types';
import recordingService from '../../services/RecordingService';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest, notFound, internal } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { requireMemberOrOwner, requireOwner } from '../../middleware/auth';
import { getPreferredLang } from '../../utils/lang';
import { debug } from '../../utils/logger';
import { getFilesBaseDir, resolveExistingPathFromCandidate } from '../../utils/filePaths';

const router = Router();

const recordingsBaseDir = getFilesBaseDir();

const escapePathForFfmpeg = (input: string): string => input.replace(/'/g, "'\\''");

const runProcess = (command: string, args: string[]): Promise<void> => new Promise((resolve, reject) => {
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

const sanitizeFileName = (input: string): string => input
  .normalize('NFKC')
  .replace(/[\s]+/g, '_')
  .replace(/[\\/:*?"<>|]+/g, '')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '')
  || 'meeting';

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
  kind: response.kind || 'concatenated',
  organizedSpeeches: response.organizedSpeeches,
  meetingId: response.meetingId && ObjectId.isValid(response.meetingId)
    ? new ObjectId(response.meetingId)
    : new ObjectId(meetingId),
  ownerId: response.ownerId && ObjectId.isValid(response.ownerId)
    ? new ObjectId(response.ownerId)
    : undefined,
});

type RecordingPayload = Omit<Recording, '_id' | 'createdAt' | 'updatedAt'> & {
  _id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

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
  // @ts-ignore
  recordings: meeting.recordings?.map(serializeRecording) || [],
  // @ts-ignore
  concatenatedRecording: meeting.concatenatedRecording ? serializeRecording(meeting.concatenatedRecording) : undefined,
  ownerId: meeting.ownerId ? meeting.ownerId.toString() : undefined,
  members: Array.isArray(meeting.members) ? meeting.members.map((m: any) => m?.toString?.() || m) : [],
  recordingOrder: Array.isArray(meeting.recordingOrder)
    ? meeting.recordingOrder
        .map((entry) => ({
          recordingId: entry.recordingId instanceof ObjectId
            ? entry.recordingId.toString()
            : entry.recordingId.toString(),
          index: entry.index,
          enabled: entry.enabled !== false,
        }))
        .sort((a, b) => a.index - b.index)
    : undefined,
});

// (Removed meetings-specific health check; root /health covers this)

// Get meetings for current user (owner or member)
// Get meetings for current user (default limit 100; use ?all=true to fetch all)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const r = req as RequestWithUser;
  const userId = r.user?.userId;
  if (!userId) {
    throw badRequest('Unauthorized', 'auth.unauthorized');
  }
  const all = typeof req.query.all === 'string' && ['true', '1', 'yes'].includes(req.query.all.toLowerCase());
  const desired = all ? 'all' : 101;
  const list = r.user?.role === 'admin'
    ? await meetingService.getAllMeetings(desired as any)
    : await meetingService.getMeetingsForUser(userId, desired as any);
  const overLimit = !all && list.length > 100;
  const meetings = overLimit ? list.slice(0, 100) : list;
  const fetchedAll = all || !overLimit;
  res.json({ meetings: meetings.map(serializeMeeting), fetchedAll });
}));

// Get meeting by ID (owner or member only)
router.get('/:id', requireMemberOrOwner(), asyncHandler(async (req: Request, res: Response) => {
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
    recordings
  });
}));

// Create new private meeting (owner = current user)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
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
  res.status(201).json(serializeMeeting(meeting));
}));

// Update meeting
router.put('/:id', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const request: MeetingUpdate = req.body;

  const meeting = await meetingService.updateMeeting(id, request);

  if (!meeting) {
    throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
  }

  res.json(serializeMeeting(meeting));
}));

// Delete meeting
router.delete('/:id', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await meetingService.deleteMeeting(id);

  if (!deleted) {
    throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
  }

  const lang = getPreferredLang(req);
  res.json({ message: lang === 'en' ? 'Meeting deleted successfully' : '会议删除成功' });
}));

// Add recording to meeting
router.post('/:id/recordings', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { recordingId } = req.body as { recordingId?: string };

  if (!recordingId) {
    throw badRequest('recordingId is required', 'recording.id_required');
  }

  const meeting = await recordingService.addRecordingToMeeting(id, recordingId);

  res.json(meeting);
}));

// Remove recording from meeting
router.delete('/:id/recordings/:recordingId', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
  const { id, recordingId } = req.params;
  const meeting = await meetingService.removeRecordingFromMeeting(id, recordingId);

  if (!meeting) {
    throw notFound(`Meeting not found (ID: ${id})`, 'meeting.not_found');
  }

  res.json(serializeMeeting(meeting));
}));

// Get meetings by status
router.get('/status/:status', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.params;
  // NOTE: Filter by status then by access is done on service side currently for all; here we reuse list for user and filter.
  const r = req as RequestWithUser;
  const userId = r.user?.userId;
  if (!userId) {
    throw badRequest('Unauthorized', 'auth.unauthorized');
  }
  const base = r.user?.role === 'admin'
    ? await meetingService.getAllMeetings('all')
    : await meetingService.getMeetingsForUser(userId, 'all');
  const meetings = base.filter((m) => m.status === status as any);
  res.json(meetings.map(serializeMeeting));
}));

// Get upcoming meetings
router.get('/upcoming', asyncHandler(async (req: Request, res: Response) => {
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
}));

// Generate verbatim transcript for a recording
router.post('/:meetingId/recordings/:recordingId/verbatim', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
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

  const updatedMeeting = await meetingService.updateMeeting(meetingId, { _id: meeting._id } as any);

  {
    const lang = getPreferredLang(req);
    res.json({
    success: true,
    verbatimTranscript: recording.verbatimTranscript,
    message: lang === 'en' ? 'Verbatim transcript generated' : '逐字稿生成成功',
    meeting: updatedMeeting ? serializeMeeting(updatedMeeting) : null
    });
  }
}));

// Generate final polished transcript for meeting
router.post('/:meetingId/final-transcript', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
  const { meetingId } = req.params;

  const meeting = await meetingService.getMeetingById(meetingId);
  if (!meeting) {
    throw notFound(`Meeting not found (ID: ${meetingId})`, 'meeting.not_found');
  }

  const recordings = await recordingService.getRecordingsByMeetingId(meetingId);

  const transcripts = recordings
    .filter((r: RecordingResponse) => r.transcription)
    .map((r: RecordingResponse) => r.transcription)
    .filter(Boolean);

  if (transcripts.length === 0) {
    throw badRequest('No transcriptions available for this meeting', 'meeting.no_transcriptions');
  }

  const allTranscripts = transcripts.join('\n\n');
  meeting.finalTranscript = `# 会议纪要 - ${meeting.title}

## 会议概要
本次会议主要讨论了相关议题，参会人员进行了深入的交流和讨论。

## 主要内容
${allTranscripts.split('\n').map((line: string) => `- ${line}`).join('\n')}

## 后续行动
- 整理会议记录
- 跟进相关事项
- 安排下次会议

---
*此纪要由AI自动生成，仅供参考。*`;

  await meetingService.updateMeeting(meetingId, {
    _id: meeting._id,
    finalTranscript: meeting.finalTranscript
  } as any);

  {
    const lang = getPreferredLang(req);
    res.json({
    success: true,
    finalTranscript: meeting.finalTranscript,
    message: lang === 'en' ? 'Final transcript generated' : '最终纪要生成成功',
    });
  }
}));

// Generate AI advice for a todo item
router.post('/:meetingId/todo-advice', requireMemberOrOwner(), asyncHandler(async (req: Request, res: Response) => {
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
    message: lang === 'en' ? 'AI suggestion generated' : 'AI建议生成成功'
    });
  }
}));

// Extract disputed issues and todos from meeting transcript
router.post('/:meetingId/extract-analysis', requireMemberOrOwner(), asyncHandler(async (req: Request, res: Response) => {
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

  try {
    const extractionResult = await transcriptExtractionService.extractFromTranscript(transcript);
    const formattedAnalysis = transcriptExtractionService.formatExtractionForMeeting(extractionResult);

    const updateData: any = {
      _id: meeting._id,
      disputedIssues: formattedAnalysis.disputedIssues,
      parsedTodos: formattedAnalysis.todos
    };

    if (!meeting.finalTranscript && transcript) {
      updateData.finalTranscript = transcript;
    }

    const updatedMeeting = await meetingService.updateMeeting(meetingId, updateData);

    res.json({
      success: true,
      data: {
        disputedIssues: formattedAnalysis.disputedIssues,
        todos: formattedAnalysis.todos,
        metadata: formattedAnalysis.metadata
      },
      message: '转录分析完成',
      meeting: updatedMeeting ? serializeMeeting(updatedMeeting) : null
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        throw internal(
          'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
          'analysis.missing_api_key'
        );
      }
      if (error.message.includes('Transcript text is required')) {
        throw badRequest(error.message, 'analysis.transcript_required');
      }
    }

    throw internal(
      'Failed to extract analysis from transcript',
      'analysis.failed',
      error instanceof Error ? error.message : error
    );
  }
}));

// Concatenate meeting recordings into a single file
router.post('/:meetingId/concatenate-recordings', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
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
    ? body.recordingIds
        .map((value) => (typeof value === 'string' ? value : String(value || '')).trim())
        .filter((value) => value.length > 0)
    : [];

  const recordingsMap = new Map(recordings.map((record) => [record._id, record]));
  const orderEntries = Array.isArray(meeting.recordingOrder)
    ? meeting.recordingOrder
        .filter((entry) => entry && entry.enabled !== false)
        .sort((a, b) => a.index - b.index)
        .map((entry) => {
          const value = entry.recordingId;
          if (value instanceof ObjectId) {
            return value.toString();
          }
          return typeof value === 'string' ? value : value?.toString?.();
        })
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];

  const ordered: RecordingResponse[] = [];
  const seen = new Set<string>();

  orderEntries.forEach((id) => {
    const record = recordingsMap.get(id);
    if (record && record.kind !== 'concatenated' && !seen.has(id)) {
      ordered.push(record);
      seen.add(id);
    }
  });

  recordings.forEach((record) => {
    if (record.kind === 'concatenated') {
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
        if (!record || record.kind === 'concatenated') {
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
    const ext = ((record.format && record.format.trim()) || 'wav').replace(/^\./, '').toLowerCase();
    const candidate = `${record._id}.${ext}`;
    try {
      const absolutePath = await resolveExistingPathFromCandidate(recordingsBaseDir, candidate);
      resolvedFiles.push({ record, path: absolutePath });
    } catch {
      throw notFound(`Audio file not found for recording ${record._id}`, 'meeting.concatenate_missing_file');
    }
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-concatenate-'));
  const listPath = path.join(tempDir, 'inputs.txt');
  const outputPath = path.join(tempDir, 'concatenated.wav');

  try {
    const normalizedFiles: Array<{ record: RecordingResponse; path: string }> = [];

    for (const [index, item] of resolvedFiles.entries()) {
      const normalizedPath = path.join(tempDir, `normalized-${index}.wav`);
      const args = [
        '-y',
        '-i', item.path,
        '-c:a', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        normalizedPath,
      ];
      await runProcess('ffmpeg', args);
      normalizedFiles.push({ record: item.record, path: normalizedPath });
    }

    if (normalizedFiles.length === 1) {
      await fs.rm(outputPath, { force: true }).catch(() => undefined);
      await fs.rename(normalizedFiles[0].path, outputPath);
    } else {
      const listContent = normalizedFiles
        .map((item) => `file '${escapePathForFfmpeg(item.path)}'`)
        .join('\n');
      await fs.writeFile(listPath, `${listContent}\n`, 'utf8');
      const args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c:a', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        outputPath,
      ];
      await runProcess('ffmpeg', args);
    }

    const stats = await fs.stat(outputPath);
    const metadata = await parseFile(outputPath).catch(() => null);
    const duration = metadata?.format?.duration && Number.isFinite(metadata.format.duration)
      ? Number(metadata.format.duration)
      : fallbackDuration;
    const sampleRate = metadata?.format?.sampleRate && Number.isFinite(metadata.format.sampleRate)
      ? Number(metadata.format.sampleRate)
      : undefined;
    const channels = metadata?.format?.numberOfChannels && Number.isFinite(metadata.format.numberOfChannels)
      ? Number(metadata.format.numberOfChannels)
      : undefined;

    let ownerId: string | undefined = meeting.ownerId instanceof ObjectId
      ? meeting.ownerId.toHexString()
      : undefined;
    if (!ownerId && meeting.ownerId && typeof (meeting.ownerId as any).toString === 'function') {
      const candidate = (meeting.ownerId as any).toString();
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
      kind: 'concatenated',
    });

    const finalFilename = `${newRecording._id}.wav`;
    const finalPath = path.join(recordingsBaseDir, finalFilename);

    await fs.rm(finalPath, { force: true }).catch(() => undefined);
    await fs.rename(outputPath, finalPath);

    const concatenatedRecording = responseToRecording({
      ...newRecording,
      kind: newRecording.kind || 'concatenated',
      source: newRecording.source || 'concatenated',
      meetingId,
      ownerId,
    }, meetingId);

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
}));

// Member management (owner or admin)
router.post('/:id/members', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
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
}));

router.delete('/:id/members/:userId', requireOwner(), asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = req.params as { id: string; userId: string };
  const updated = await meetingService.removeMember(id, userId);
  if (!updated) {
    throw notFound('Meeting not found', 'meeting.not_found');
  }
  res.json(serializeMeeting(updated));
}));

export default router;
