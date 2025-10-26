# AI and OpenAI Usage Documentation

## Overview

This document provides a comprehensive overview of all AI and OpenAI-related functionality within the Summit meeting intelligence platform. The platform uses a combination of OpenAI services for natural language processing and external Echo services for audio processing.

## Architecture Summary

The Summit platform implements a multi-service AI architecture:

- **OpenAI GPT Models**: Language understanding, analysis, and chat functionality
- **Echo Services**: Specialized audio processing services
  - Echo Stream (2592): Live recording
  - Echo Voices (2593): Speaker segmentation
  - Echo Vault (2594): Audio transcription
  - Echo Aligner (2595): Text alignment

## 1. OpenAI Integration

### 1.1 Transcript Chat Service
**File**: `backend/src/services/TranscriptChatService.ts`

**Purpose**: AI-powered conversational interface for meeting transcripts

**Key Features**:
- Generates 3-5 relevant suggested questions based on meeting content
- Provides streaming Q&A responses about transcript content
- Uses Chinese language prompts and responses
- Implements fallback mechanisms for error handling

**Configuration**:
```typescript
// Environment Variables
SUMMIT_OPENAI_API_KEY // Primary API key
OPENAI_API_KEY        // Alternative API key
SUMMIT_OPENAI_BASE_URL // Custom base URL (default: OpenAI)
OPENAI_BASE_URL       // Alternative base URL
SUMMIT_OPENAI_MODEL   // Model selection (default: gpt-4o-mini)
OPENAI_MODEL          // Alternative model
```

**API Usage**:
- `generateSuggestedQuestions(transcript, meetingTitle)` - Creates relevant questions
- `chatStream(transcript, userMessage, history)` - Streaming chat responses

### 1.2 Transcript Extraction Service
**File**: `backend/src/services/TranscriptExtractionService.ts`

**Purpose**: Extracts structured information from meeting transcripts using AI

**Key Features**:
- Identifies disputed issues and conflicts with severity levels
- Extracts action items, tasks, and todos with assignees and priorities
- Uses InText library for structured extraction from large documents
- Supports configurable chunking and concurrent processing

**Configuration**:
```typescript
// Environment Variables
SUMMIT_INTEXT_CHUNK_TOKENS=500    // Token size for text chunks
SUMMIT_INTEXT_OVERLAP_TOKENS=50   // Overlap between chunks
SUMMIT_INTEXT_CONCURRENCY=8       // Concurrent processing limit
```

**Schema Definition**:
```typescript
interface DisputedIssue {
  text: string;
  severity: 'low' | 'medium' | 'high';
  parties: Array<{ name: string }>;
}

interface Todo {
  text: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}
```

## 2. External AI Services (Echo Services)

### 2.1 Speaker Segmentation Service
**File**: `backend/src/services/SegmentationService.ts`
**Service**: Echo Voices (Port 2593)

**Purpose**: Identifies and separates different speakers in audio recordings

**Configuration**:
```typescript
SEGMENTATION_SERVICE_URL=http://localhost:2593
```

**Key Features**:
- Automatic speaker detection and counting
- Support for oracle hints (expected number of speakers)
- Timeline-based speaker segmentation
- Integration with organized speeches

### 2.2 Audio Transcription Service
**File**: `backend/src/services/RecordingService.ts`
**Service**: Echo Vault (Port 2594)

**Purpose**: Converts audio recordings to text transcripts

**Configuration**:
```typescript
TRANSCRIPTION_SERVICE_URL=http://localhost:2594
TRANSCRIBE_SERVICE_URL=http://localhost:2594 // Alternative
```

**Key Features**:
- Multi-language transcription support
- Hotword integration for custom trigger words
- Multipart file upload handling
- Real-time and batch processing

### 2.3 Text Alignment Service
**File**: `backend/src/services/AlignerService.ts`
**Service**: Echo Aligner (Port 2595)

**Purpose**: Synchronizes audio recordings with transcript timestamps

**Configuration**:
```typescript
ALIGNER_SERVICE_URL=http://localhost:2595
```

**Key Features**:
- Word-level timestamp alignment
- Audio-to-text synchronization
- Support for multiple alignment formats
- Health monitoring and error handling

## 3. Frontend AI Features

### 3.1 AI Actions Dialog
**File**: `frontend/src/components/Audio/AiActionsDialog.tsx`

**Purpose**: User interface for AI-powered meeting assistance

**AI Action Categories**:
1. **梳理议程** (Agenda Organization) - Structure and optimize meeting agenda
2. **调节争议** (Dispute Mediation) - Assist in resolving conflicts
3. **头脑风暴** (Brainstorming) - Generate creative ideas
4. **生成摘要** (Generate Summary) - Create meeting summaries
5. **智能分析** (Intelligent Analysis) - Deep content analysis
6. **行动计划** (Action Planning) - Develop follow-up action plans

### 3.2 Recording Analysis Component
**File**: `frontend/src/pages/Recordings/components/RecordingAnalysis.tsx`

**Purpose**: Speaker analysis and conversation insights

**AI-Powered Features**:
- Speaker timeline visualization
- Speaking time statistics and percentages
- Conversation pattern analysis
- Speaker identification and naming
- Average speaking duration calculations
- Speaker switch frequency analysis

### 3.3 Analysis Result Hook
**File**: `frontend/src/hooks/useAnalysisResult.ts`

**Purpose**: State management for AI analysis results

**Features**:
- Real-time analysis result updates
- Error handling and loading states
- Caching of analysis results
- Granular result management (disputed issues, todos)

## 4. Live Recording and Real-time Processing

### 4.1 Live Recorder Service
**File**: `backend/src/services/LiveRecorderService.ts`

**Purpose**: Real-time audio capture and processing

**Key Features**:
- WebSocket-based audio streaming
- Real-time audio chunk processing
- Automatic file format conversion (PCM to WAV)
- Encrypted file storage
- Session management and cleanup

**Technical Details**:
- Sample rate: 16kHz
- Format: 16-bit PCM mono
- File format: WAV with proper headers
- Encryption: AES-256-GCM (optional)

## 5. Health Monitoring and Service Management

### 5.1 Health Checker
**File**: `backend/src/utils/healthChecker.ts`

**Purpose**: Monitors health of all external AI services

**Monitored Services**:
- Echo Voices (Segmentation)
- Echo Vault (Transcription)
- Echo Aligner (Alignment)
- FFmpeg installation

**Health Endpoints**:
- Each service provides `/health` endpoint
- Automatic service availability checking
- Startup health verification

## 6. Configuration and Environment Setup

### 6.1 Required Environment Variables

```bash
# OpenAI Configuration
SUMMIT_OPENAI_API_KEY=sk-your-openai-api-key
SUMMIT_OPENAI_BASE_URL=https://api.openai.com/v1
SUMMIT_OPENAI_MODEL=gpt-4o-mini

# External AI Services
SEGMENTATION_SERVICE_URL=http://localhost:2593
TRANSCRIPTION_SERVICE_URL=http://localhost:2594
ALIGNER_SERVICE_URL=http://localhost:2595

# InText Configuration (for Transcript Extraction)
SUMMIT_INTEXT_CHUNK_TOKENS=500
SUMMIT_INTEXT_OVERLAP_TOKENS=50
SUMMIT_INTEXT_CONCURRENCY=8

# Optional Audio Encryption
AUDIO_ENCRYPTION_KEY=your-32-byte-base64-key
```

### 6.2 Service Dependencies

**Core Services Required**:
- MongoDB (data storage)
- FFmpeg (audio processing)
- OpenAI API access
- All four Echo services

**Development Setup**:
```bash
# Start Echo services on their respective ports
echo-voices    # Port 2593
echo-vault     # Port 2594
echo-aligner   # Port 2595
echo-stream    # Port 2592
```

## 7. API Endpoints

### 7.1 AI-Related Routes

**Meeting Analysis**:
- `POST /api/meetings/:id/analyze` - Extract AI insights from meetings
- `POST /api/meetings/:id/chat` - Chat with transcript about meeting

**Recording Processing**:
- `POST /api/recordings/:id/transcribe` - Generate transcription
- `POST /api/recordings/:id/polish` - Optimize transcription with AI
- `POST /api/recordings/:id/segment` - Speaker segmentation
- `POST /api/recordings/:id/align` - Text alignment

**Live Features**:
- `WS /ws/live-recorder` - Real-time audio streaming
- `POST /api/recordings/start` - Start live recording session

## 8. Error Handling and Fallbacks

### 8.1 OpenAI Service Fallbacks
- Predefined fallback questions when chat service fails
- Graceful degradation when AI services are unavailable
- Local processing for basic features without AI

### 8.2 External Service Resilience
- Health checking before service usage
- Timeout handling for long-running operations
- Retry mechanisms for failed requests
- Error propagation to frontend with user-friendly messages

## 9. Security Considerations

### 9.1 API Key Management
- Environment variable storage for API keys
- Support for custom OpenAI base URLs
- No hardcoded credentials in source code

### 9.2 Data Privacy
- Optional audio file encryption
- Secure file handling and storage
- Request/response logging without sensitive data

## 10. Future AI Integration Points

### 10.1 Potential Enhancements
- Real-time transcription during live meetings
- Advanced sentiment analysis
- Automatic meeting summary generation
- Integration with more AI models (Claude, Gemini, etc.)
- Multi-language meeting analysis

### 10.2 Scalability Considerations
- Load balancing for AI service requests
- Caching of AI responses
- Batch processing for large transcripts
- Rate limiting for API calls

## 11. Troubleshooting

### 11.1 Common Issues
1. **OpenAI API Errors**: Check API key and model availability
2. **Echo Service Unavailable**: Verify service health and port configuration
3. **Transcription Failures**: Ensure audio format compatibility
4. **Memory Issues**: Adjust InText chunking parameters for large documents

### 11.2 Debug Tools
- Health check endpoint: `/health`
- Service status: Available in backend logs
- Analysis metadata: Included in API responses

---

*Last Updated: 2025-10-26*
*This document should be updated whenever new AI features are added or existing ones are modified.*