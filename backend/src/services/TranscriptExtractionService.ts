import { createIntext, SchemaField, ExtractResult, OpenAICompatibleClient, ProgressEvent } from 'intext';
import recordingService from './RecordingService';
import { badRequest, internal } from '../utils/errors';
import { defaultClient, model } from '../utils/openai';

// Schema for extracting disputed issues and todos from meeting transcripts
const transcriptAnalysisSchema: SchemaField = {
  type: 'object',
  properties: {
    disputedIssues: {
      type: 'array',
      description: 'List of disputed issues or conflicts discussed in the meeting',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Brief description of the disputed issue or conflict',
          },
          severity: {
            type: 'string',
            description: 'Severity level, e.g. low, medium, high',
          },
          parties: {
            type: 'array',
            description: 'Parties involved in the dispute (if mentioned)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the party involved in the dispute',
                },
              },
            },
          },
        },
      },
    },
    todos: {
      type: 'array',
      description: 'List of action items, tasks, or todos identified in the meeting',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Description of the action item or task',
          },
          assignee: {
            type: 'string',
            description: 'Person assigned to complete the task (if mentioned)',
          },
          dueDate: {
            type: 'string',
            description: 'Due date or timeframe mentioned (if any)',
          },
          priority: {
            type: 'string',
            description: 'Priority level, e.g. low, medium, high',
          },
        },
      },
    },
  },
};

type ExtractionResult = ExtractResult;

class TranscriptExtractionService {
  private intext: ReturnType<typeof createIntext> | null = null;
  private isInitialized: boolean = false;

  async initialize() {
    if (this.isInitialized) return;

    const clientParams = {
      model: model!,
      temperature: 0.1,
    };

    this.intext = createIntext({
      openai: defaultClient as any,
      clientParams,
    });

    this.isInitialized = true;
  }

  async extractFromTranscript(transcript: string, onProgress?: (event: ProgressEvent) => void): Promise<ExtractionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!transcript || transcript.trim().length === 0) {
      throw badRequest('转录文本为必填项', 'analysis.transcript_required');
    }

    if (!this.intext) {
      throw internal('转录提取服务未初始化', 'analysis.not_initialized');
    }

    const intextParams = {
      chunkTokens: parseInt(process.env.SUMMIT_INTEXT_CHUNK_TOKENS || '500', 10),
      overlapTokens: parseInt(process.env.SUMMIT_INTEXT_OVERLAP_TOKENS || '50', 10),
      concurrency: parseInt(process.env.SUMMIT_INTEXT_CONCURRENCY || '8', 10),
    };

    console.log('intextParams:\n', intextParams);

    const result = await this.intext.extract(transcript, {
      schema: transcriptAnalysisSchema,
      debug: true,
      ...intextParams,
      ...(onProgress ? { onProgress } : {}),
    });

    return result;
  }

  async buildTranscriptFromOrganizedSpeeches(meetingId: string): Promise<string> {
    try {
      // Get all recordings for this meeting
      const recordings = await recordingService.getRecordingsByMeetingId(meetingId, false);

      if (!recordings || recordings.length === 0) {
        throw badRequest('未找到该会议的录音', 'analysis.no_recordings');
      }

      // Collect all organized speeches from recordings
      const allSpeeches: Array<{
        speakerIndex: number;
        startTime: number;
        endTime: number;
        polishedText: string;
        rawText: string;
      }> = [];

      // Add speeches from individual recordings
      recordings.forEach((recording) => {
        if (recording.organizedSpeeches && recording.organizedSpeeches.length > 0) {
          allSpeeches.push(...recording.organizedSpeeches);
        }
      });

      // Note: Combined recording speeches are handled separately in the meeting model
      // They will be accessible via meeting.concatenatedRecording if needed

      if (allSpeeches.length === 0) {
        throw badRequest('所有录音中未找到整理后的发言', 'analysis.no_speeches');
      }

      // Sort speeches by start time to create chronological transcript
      allSpeeches.sort((a, b) => a.startTime - b.startTime);

      // Build formatted transcript
      const transcriptLines: string[] = [];

      // Add header
      transcriptLines.push('# 会议记录');
      transcriptLines.push('');

      // Format each speech segment
      allSpeeches.forEach((speech) => {
        const startTime = this.formatTime(speech.startTime);
        const endTime = this.formatTime(speech.endTime);
        const speakerLabel = `发言人 ${speech.speakerIndex + 1}`;

        transcriptLines.push(`## ${speakerLabel} (${startTime} - ${endTime})`);
        transcriptLines.push('');
        transcriptLines.push(speech.polishedText || speech.rawText);
        transcriptLines.push('');
      });

      // Add summary section
      transcriptLines.push('---');
      transcriptLines.push('');
      transcriptLines.push('*此记录由系统根据录音整理生成*');

      return transcriptLines.join('\n');
    } catch (error) {
      console.error('Error building transcript from organized speeches:', error);
      throw error;
    }
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatExtractionForMeeting(extractionResult: ExtractionResult) {
    const { json, metadata } = extractionResult;

    // Convert extracted data to meeting-compatible format
    const disputedIssues =
      json.disputedIssues?.map((issue: any, index: number) => {
        const parties = Array.isArray(issue.parties)
          ? issue.parties
              .map((party: any) => {
                if (typeof party === 'string') {
                  return party.trim();
                }
                if (party && typeof party === 'object') {
                  if (typeof party.name === 'string') {
                    return party.name.trim();
                  }
                  if (typeof party.toString === 'function') {
                    return party.toString();
                  }
                }
                return undefined;
              })
              .filter((value: string | undefined): value is string => typeof value === 'string' && value.length > 0)
          : [];

        const severity = typeof issue.severity === 'string' ? issue.severity : 'medium';

        return {
          id: `issue_${Date.now()}_${index}`,
          text: issue.text,
          severity,
          parties,
        };
      }) || [];

    const todos =
      json.todos?.map((todo: any, index: number) => ({
        id: `todo_${Date.now()}_${index}`,
        text: todo.text,
        completed: false,
        assignee: typeof todo.assignee === 'string' ? todo.assignee : undefined,
        dueDate: typeof todo.dueDate === 'string' ? todo.dueDate : undefined,
        priority: typeof todo.priority === 'string' ? todo.priority : 'medium',
      })) || [];

    return {
      disputedIssues,
      todos,
      metadata: {
        totalChunks: metadata.chunkCount,
        processingTime: new Date().toISOString(),
      },
    };
  }
}

export const transcriptExtractionService = new TranscriptExtractionService();
export default transcriptExtractionService;
