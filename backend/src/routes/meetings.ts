import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import meetingService from '../services/MeetingService';
import transcriptExtractionService from '../services/TranscriptExtractionService';
import { MeetingCreate, MeetingUpdate, Meeting, RecordingResponse, Recording } from '../types';
import recordingService from '../services/RecordingService';

const router = Router();

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

type MeetingWithRecordings = Meeting & { recordings?: Recording[] };

const serializeMeeting = (meeting: MeetingWithRecordings) => ({
  ...meeting,
  _id: meeting._id.toString(),
  createdAt: toIsoString(meeting.createdAt),
  updatedAt: toIsoString(meeting.updatedAt),
  scheduledStart: toIsoString(meeting.scheduledStart),
  recordings: meeting.recordings?.map(serializeRecording) || [],
  combinedRecording: meeting.combinedRecording ? serializeRecording(meeting.combinedRecording) : undefined,
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Get meetings (default limit 100; use ?all=true to fetch all)
router.get('/', async (req: Request, res: Response) => {
  try {
    const all = typeof req.query.all === 'string' && ['true', '1', 'yes'].includes(req.query.all.toLowerCase());
    const desired = all ? 'all' : 101;
    const list = await meetingService.getAllMeetings(desired as any);
    const overLimit = !all && list.length > 100;
    const meetings = overLimit ? list.slice(0, 100) : list;
    const fetchedAll = all || !overLimit;
    res.json({ meetings: meetings.map(serializeMeeting), fetchedAll });
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meeting by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Validate ObjectId format; return 400 if invalid
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid meeting id' });
    }
    const meeting = await meetingService.getMeetingById(id);
    
    if (!meeting) {
      return res.status(404).json({ error: `Meeting not found (ID: ${id})` });
    }
    
    const recordings = await recordingService.getRecordingsByMeetingId(id, false);
    res.json({
      ...meeting,
      recordings
    });
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new meeting
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: MeetingCreate = req.body;
    
    // Validate required fields
    if (!request.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const meeting = await meetingService.createMeeting(request);
    res.status(201).json(serializeMeeting(meeting));
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update meeting
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request: MeetingUpdate = req.body;
    
    const meeting = await meetingService.updateMeeting(id, request);
    
    if (!meeting) {
      return res.status(404).json({ error: `Meeting not found (ID: ${id})` });
    }
    
    res.json(serializeMeeting(meeting));
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete meeting
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await meetingService.deleteMeeting(id);
    
    if (!deleted) {
      return res.status(404).json({ error: `Meeting not found (ID: ${id})` });
    }
    
    res.json({ message: '会议删除成功' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add recording to meeting
router.post('/:id/recordings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { recordingId } = req.body;
    const meeting = await recordingService.addRecordingToMeeting(id, recordingId);

    res.json(meeting);
  } catch (error) {
    console.error('Error adding recording to meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove recording from meeting
router.delete('/:id/recordings/:recordingId', async (req: Request, res: Response) => {
  try {
    const { id, recordingId } = req.params;
    const meeting = await meetingService.removeRecordingFromMeeting(id, recordingId);
    
    if (!meeting) {
      return res.status(404).json({ error: `Meeting not found (ID: ${id})` });
    }
    
    res.json(serializeMeeting(meeting));
  } catch (error) {
    console.error('Error removing recording from meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get meetings by status
router.get('/status/:status', async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const meetings = await meetingService.getMeetingsByStatus(status);
    res.json(meetings.map(serializeMeeting));
  } catch (error) {
    console.error('Error getting meetings by status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming meetings
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const meetings = await meetingService.getUpcomingMeetings();
    res.json(meetings.map(serializeMeeting));
  } catch (error) {
    console.error('Error getting upcoming meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate verbatim transcript for a recording
router.post('/:meetingId/recordings/:recordingId/verbatim', async (req: Request, res: Response) => {
  try {
    const { meetingId, recordingId } = req.params;
    
    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: `Meeting not found (ID: ${meetingId})` });
    }
    
    const recordings = await recordingService.getRecordingsByMeetingId(meetingId, true);
    const recording = recordings.find((r) => r._id.toString() === recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    if (!recording.transcription) {
      return res.status(400).json({ error: 'Recording must have transcription first' });
    }
    
    // TODO: Implement actual verbatim transcript generation
    // For now, just add some placeholder text
    recording.verbatimTranscript = `[逐字稿 - 待实现]\n原始转录: ${recording.transcription}\n\n这里将会生成包含语气词、停顿、重复等原始语音特征的逐字稿。`;
    
    const updatedMeeting = await meetingService.updateMeeting(meetingId, { _id: meeting._id } as any);
    
    res.json({
      success: true,
      verbatimTranscript: recording.verbatimTranscript,
      message: '逐字稿生成成功',
      meeting: updatedMeeting ? serializeMeeting(updatedMeeting) : null
    });
  } catch (error) {
    console.error('Error generating verbatim transcript:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate final polished transcript for meeting
router.post('/:meetingId/final-transcript', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: `Meeting not found (ID: ${meetingId})` });
    }
    
    const recordings = await recordingService.getRecordingsByMeetingId(meetingId, true);

    const transcripts = recordings
      .filter((r: RecordingResponse) => r.transcription)
      .map((r: RecordingResponse) => r.transcription)
      .filter(Boolean);
    
    if (transcripts.length === 0) {
      return res.status(400).json({ error: 'No transcriptions available for this meeting' });
    }
    
    // TODO: Implement actual AI polishing with OpenAI
    // For now, generate a placeholder summary
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
    
    res.json({
      success: true,
      finalTranscript: meeting.finalTranscript,
      message: '最终纪要生成成功',
    });
  } catch (error) {
    console.error('Error generating final transcript:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate AI advice for a todo item
router.post('/:meetingId/todo-advice', async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { meetingId } = req.params; // TODO: Use meetingId for context in AI advice generation
    const { todoText } = req.body;
    
    if (!todoText) {
      return res.status(400).json({ error: 'Todo text is required' });
    }
    
    // TODO: Implement actual AI advice generation with OpenAI
    // For now, generate a placeholder advice
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

    res.json({
      success: true,
      advice: advice,
      message: 'AI建议生成成功'
    });
  } catch (error) {
    console.error('Error generating AI advice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Extract disputed issues and todos from meeting transcript
router.post('/:meetingId/extract-analysis', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: `Meeting not found (ID: ${meetingId})` });
    }
    
    let transcript = meeting.finalTranscript;
    
    // If no final transcript exists, try to build one from organized speeches
    if (!transcript) {
      try {
        transcript = await transcriptExtractionService.buildTranscriptFromOrganizedSpeeches(meetingId);
        console.log('Built transcript from organized speeches for analysis');
      } catch (error) {
        console.log('Could not build transcript from organized speeches:', error);
        return res.status(400).json({ 
          error: 'Meeting must have a final transcript or organized speeches from recordings before analysis can be performed' 
        });
      }
    }
    
    // Extract analysis using intext
    const extractionResult = await transcriptExtractionService.extractFromTranscript(transcript);
    
    // Format the results for meeting storage
    const formattedAnalysis = transcriptExtractionService.formatExtractionForMeeting(extractionResult);
    
    // Update the meeting with extracted data
    // Also save the generated transcript if it was built from organized speeches
    const updateData: any = {
      _id: meeting._id,
      disputedIssues: formattedAnalysis.disputedIssues,
      parsedTodos: formattedAnalysis.todos
    };
    
    // If we built the transcript from organized speeches, save it as finalTranscript
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
    console.error('Error extracting analysis from transcript:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return res.status(500).json({ 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
        });
      }
      if (error.message.includes('Transcript text is required')) {
        return res.status(400).json({ error: error.message });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to extract analysis from transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
