import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
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

const router = Router();

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
  combinedRecording: meeting.combinedRecording ? serializeRecording(meeting.combinedRecording) : undefined,
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
