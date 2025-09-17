import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import meetingService from '../services/MeetingService';
import { MeetingCreate, MeetingUpdate, Recording, Meeting } from '../types';

const router = Router();

type RecordingPayload = Omit<Recording, '_id' | 'createdAt'> & {
  _id: string;
  createdAt?: string | Date;
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
});

const serializeMeeting = (meeting: Meeting) => ({
  ...meeting,
  _id: meeting._id.toString(),
  createdAt: toIsoString(meeting.createdAt),
  updatedAt: toIsoString(meeting.updatedAt),
  scheduledStart: toIsoString(meeting.scheduledStart),
  recordings: meeting.recordings?.map(serializeRecording) || [],
});

const deserializeRecording = (payload: RecordingPayload): Recording => ({
  ...payload,
  _id: ObjectId.isValid(payload._id) ? new ObjectId(payload._id) : new ObjectId(),
  createdAt: payload.createdAt instanceof Date ? payload.createdAt : new Date(payload.createdAt || Date.now()),
});
// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Get all meetings
router.get('/', async (req: Request, res: Response) => {
  try {
    const meetings = await meetingService.getAllMeetings();
    res.json(meetings.map(serializeMeeting));
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meeting by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meeting = await meetingService.getMeetingById(id);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json(serializeMeeting(meeting));
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
      return res.status(404).json({ error: 'Meeting not found' });
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
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add recording to meeting
router.post('/:id/recordings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recordingPayload = req.body as RecordingPayload;
    const meeting = await meetingService.addRecordingToMeeting(id, deserializeRecording(recordingPayload));
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json(serializeMeeting(meeting));
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
      return res.status(404).json({ error: 'Meeting not found' });
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

// Save recording (for real-time speech recognition)
router.post('/save-recording', (req: Request, res: Response) => {
  try {
    const { meetingId, transcription, duration, filename } = req.body;
    
    if (!meetingId || !transcription) {
      return res.status(400).json({ error: 'Meeting ID and transcription are required' });
    }
    
    // 为演示目的生成一个假的下载链接
    const downloadUrl = `/recordings/${filename}`;
    
    res.json({
      success: true,
      filename: filename,
      downloadUrl: downloadUrl,
      message: 'Recording saved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate verbatim transcript for a recording
router.post('/:meetingId/recordings/:recordingId/verbatim', async (req: Request, res: Response) => {
  try {
    const { meetingId, recordingId } = req.params;
    
    const meeting = await meetingService.getMeetingById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const recording = meeting.recordings.find((r: Recording) => r._id.toString() === recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    if (!recording.transcription) {
      return res.status(400).json({ error: 'Recording must have transcription first' });
    }
    
    // TODO: Implement actual verbatim transcript generation
    // For now, just add some placeholder text
    recording.verbatimTranscript = `[逐字稿 - 待实现]\n原始转录: ${recording.transcription}\n\n这里将会生成包含语气词、停顿、重复等原始语音特征的逐字稿。`;
    
    const updatedMeeting = await meetingService.updateMeeting(meetingId, { recordings: meeting.recordings });
    
    res.json({
      success: true,
      verbatimTranscript: recording.verbatimTranscript,
      message: 'Verbatim transcript generated successfully',
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
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const transcripts = meeting.recordings
      .filter((r: Recording) => r.transcription)
      .map((r: Recording) => r.transcription)
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
    
    const updatedMeeting = await meetingService.updateMeeting(meetingId, { 
      finalTranscript: meeting.finalTranscript 
    });
    
    res.json({
      success: true,
      finalTranscript: meeting.finalTranscript,
      message: 'Final transcript generated successfully'
    });
  } catch (error) {
    console.error('Error generating final transcript:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
