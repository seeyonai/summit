import { createIntext, SchemaField } from 'intext';

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
            throw new Error(`LLM error ${res.status}: ${errorText}`);
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const openai = createOpenAIClient(apiKey);
    
    this.intext = createIntext({
      openai,
      clientParams: { 
        model: 'gpt-4o-mini', 
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
      throw new Error('Transcript text is required');
    }

    const result = await this.intext.extract(transcript, {
      schema: transcriptAnalysisSchema,
      chunkTokens: 1000,
      overlapTokens: 200,
      concurrency: 2,
    });

    return result;
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