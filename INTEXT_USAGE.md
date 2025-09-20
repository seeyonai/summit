# Intext Package Usage Documentation

## Overview

This document provides documentation for using the `intext` package to extract structured data from meeting transcripts in the Summit application.

## Installation

The `intext` package is already installed in the backend:

```bash
npm install intext
```

## Environment Setup

Before using the intext service, ensure you have:

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
   ```bash
   export OPENAI_API_KEY=your_openai_api_key_here
   ```

## Service Integration

### TranscriptExtractionService

Located at: `/backend/src/services/TranscriptExtractionService.ts`

#### Key Features:
- Extracts disputed issues and action items from meeting transcripts
- Uses sliding-window chunking for long transcripts
- Integrates with OpenAI GPT models for intelligent extraction
- Returns structured JSON with provenance information

#### Usage Example:

```typescript
import transcriptExtractionService from '../services/TranscriptExtractionService';

// Initialize the service (automatically called on first use)
await transcriptExtractionService.initialize();

// Extract analysis from a transcript
const transcript = `Meeting transcript text here...`;
const result = await transcriptExtractionService.extractFromTranscript(transcript);

// Format results for meeting storage
const formattedData = transcriptExtractionService.formatExtractionForMeeting(result);
```

## API Endpoint

### POST /api/meetings/:id/extract-analysis

Extracts disputed issues and todos from a meeting's final transcript.

#### Request:
```bash
POST /api/meetings/{meetingId}/extract-analysis
Content-Type: application/json
```

#### Response:
```json
{
  "success": true,
  "data": {
    "disputedIssues": [
      {
        "id": "issue_123456_0",
        "text": "Disagreement about project timeline",
        "severity": "medium",
        "parties": ["Development Team", "Product Management"]
      }
    ],
    "todos": [
      {
        "id": "todo_123456_0",
        "text": "Prepare project timeline proposal",
        "completed": false,
        "assignee": "John Doe",
        "dueDate": "2024-01-15",
        "priority": "high"
      }
    ],
    "metadata": {
      "totalChunks": 3,
      "processingTime": "2024-01-10T10:30:00.000Z"
    }
  },
  "message": "Transcript analysis completed successfully"
}
```

#### Error Responses:
- `400`: Meeting not found or no final transcript available
- `500`: OpenAI API key not configured or extraction failed

## Extraction Schema

The service uses the following schema to extract information:

### Disputed Issues:
- **text**: Brief description of the disputed issue
- **severity**: low, medium, or high
- **parties**: Array of involved parties (if mentioned)

### Todos:
- **text**: Description of the action item
- **assignee**: Person assigned (if mentioned)
- **dueDate**: Due date or timeframe (if mentioned)
- **priority**: low, medium, or high

## Configuration Options

The intext service is configured with:
- **Model**: GPT-4o-mini (optimized for cost and performance)
- **Temperature**: 0.1 (low for consistency)
- **Chunk Tokens**: 1000 (balance between context and cost)
- **Overlap Tokens**: 200 (ensures continuity between chunks)
- **Concurrency**: 2 (parallel processing)

## Best Practices

1. **Prerequisite**: Ensure the meeting has a `finalTranscript` before calling extraction
2. **API Key**: Always keep your OpenAI API key secure and use environment variables
3. **Error Handling**: The service includes comprehensive error handling for API failures
4. **Data Validation**: Extracted data is validated and formatted before storage
5. **Cost Management**: Uses GPT-4o-mini for cost-effective processing

## Integration Workflow

1. Generate or obtain a meeting transcript
2. Store it in the meeting's `finalTranscript` field
3. Call the extraction endpoint
4. Review and use the extracted disputed issues and todos
5. Data is automatically stored in the meeting record

## Troubleshooting

### Common Issues:
1. **OPENAI_API_KEY not set**: Ensure the environment variable is properly configured
2. **No final transcript**: The meeting must have a transcript before extraction
3. **API rate limits**: Monitor OpenAI usage and implement rate limiting if needed
4. **Empty results**: Check transcript quality and content relevance

### Debug Information:
The service returns metadata including:
- Number of chunks processed
- Processing timestamps
- Per-field provenance tracking

## Security Considerations

- API keys are stored in environment variables, not in code
- Transcript data is sent to OpenAI's API - ensure compliance with data privacy policies
- Consider data retention policies for extracted sensitive information

## Future Enhancements

Potential improvements:
- Support for other LLM providers (Anthropic, local models)
- Custom schema definitions per meeting type
- Batch processing for multiple meetings
- Real-time extraction during live meetings