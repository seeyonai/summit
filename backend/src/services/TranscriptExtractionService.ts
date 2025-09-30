import { createIntext, SchemaField } from 'intext';
import recordingService from './RecordingService';
import { badRequest, internal } from '../utils/errors';

// Create OpenAI-compatible client
function createOpenAIClient(apiKey: string, baseURL = 'https://api.openai.com/v1') {
  return {
    chat: {
      completions: {
        create: async (args: Record<string, any>) => {
          const res = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${apiKey}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify(args),
          });
          if (!res.ok) {
            const errorText = await res.text();
            throw internal(`LLM error ${res.status}: ${errorText}`, 'analysis.llm_error');
          }
          return res.json();
        },
      },
    },
  };
}

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
            description: 'Brief description of the disputed issue or conflict'
          },
          severity: {
            type: 'string',
            description: 'Severity level: low, medium, high (one of: low, medium, high)'
          },
          parties: {
            type: 'array',
            description: 'Parties involved in the dispute (if mentioned)',
            items: { type: 'string' }
          } as any
        }
      }
    },
    todos: {
      type: 'array',
      description: 'List of action items, tasks, or todos identified in the meeting',
      items: {
        type: 'object',
        properties: {
          text: { 
            type: 'string',
            description: 'Description of the action item or task'
          },
          assignee: {
            type: 'string',
            description: 'Person assigned to complete the task (if mentioned)'
          },
          dueDate: {
            type: 'string',
            description: 'Due date or timeframe mentioned (if any)'
          },
          priority: {
            type: 'string',
            description: 'Priority level: low, medium, high (one of: low, medium, high)'
          }
        }
      }
    }
  }
};

interface ExtractedAnalysis {
  disputedIssues: Array<{
    text: string;
    severity: 'low' | 'medium' | 'high';
    parties: string[];
  }>;
  todos: Array<{
    text: string;
    assignee?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

interface ExtractionResult {
  json: ExtractedAnalysis;
  metadata: {
    chunkCount: number;
    perFieldProvenance: Record<string, { sourceChunks: number[] }>;
    rawChunkResults: Array<{ chunkId: number; parsed: Record<string, any>; raw?: string }>;
  };
}

class TranscriptExtractionService {
  private intext: any;
  private isInitialized: boolean = false;

  async initialize() {
    if (this.isInitialized) return;

    const apiKey = process.env.SUMMIT_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.SUMMIT_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
    if (!apiKey) {
      throw internal('SUMMIT_OPENAI_API_KEY or OPENAI_API_KEY environment variable is required', 'analysis.api_key_missing');
    }

    const openai = createOpenAIClient(apiKey, baseURL);
    
    this.intext = createIntext({
      openai,
      clientParams: { 
        model: process.env.SUMMIT_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini', 
        temperature: 0.1,
        max_tokens: 1000
      },
    });

    this.isInitialized = true;
  }

  async extractFromTranscript(transcript: string): Promise<ExtractionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!transcript || transcript.trim().length === 0) {
      throw badRequest('Transcript text is required', 'analysis.transcript_required');
    }

    const result = await this.intext.extract(transcript, {
      schema: transcriptAnalysisSchema,
      chunkTokens: 1000,
      overlapTokens: 200,
      concurrency: 2,
    });

    return result;
  }

  async buildTranscriptFromOrganizedSpeeches(meetingId: string): Promise<string> {
    try {
      // Get all recordings for this meeting
      const recordings = await recordingService.getRecordingsByMeetingId(meetingId, false);
      
      if (!recordings || recordings.length === 0) {
        throw badRequest('No recordings found for this meeting', 'analysis.no_recordings');
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
      recordings.forEach(recording => {
        if (recording.organizedSpeeches && recording.organizedSpeeches.length > 0) {
          allSpeeches.push(...recording.organizedSpeeches);
        }
      });

      // Note: Combined recording speeches are handled separately in the meeting model
      // They will be accessible via meeting.combinedRecording if needed

      if (allSpeeches.length === 0) {
        throw badRequest('No organized speeches found in any recordings', 'analysis.no_speeches');
      }

      // Sort speeches by start time to create chronological transcript
      allSpeeches.sort((a, b) => a.startTime - b.startTime);

      // Build formatted transcript
      const transcriptLines: string[] = [];
      
      // Add header
      transcriptLines.push('# 会议记录');
      transcriptLines.push('');
      
      // Format each speech segment
      allSpeeches.forEach((speech, index) => {
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
    const disputedIssues = json.disputedIssues?.map((issue: any, index: number) => ({
      id: `issue_${Date.now()}_${index}`,
      text: issue.text,
      severity: issue.severity || 'medium',
      parties: issue.parties || []
    })) || [];

    const todos = json.todos?.map((todo: any, index: number) => ({
      id: `todo_${Date.now()}_${index}`,
      text: todo.text,
      completed: false,
      assignee: todo.assignee,
      dueDate: todo.dueDate,
      priority: todo.priority || 'medium',
    })) || [];

    return {
      disputedIssues,
      todos,
      metadata: {
        totalChunks: metadata.chunkCount,
        processingTime: new Date().toISOString()
      }
    };
  }
}

export const transcriptExtractionService = new TranscriptExtractionService();
export default transcriptExtractionService;
