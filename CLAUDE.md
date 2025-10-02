# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Express + MongoDB)
```bash
cd backend
npm install                    # Install dependencies
npm run dev                    # Start development server with TSX (port 2591)
npm run build                  # Compile TypeScript to dist/
npm start                      # Run compiled server
npm run lint                   # ESLint for TypeScript files
npm test                       # Run Jest test suite
npm run typecheck              # TypeScript type checking without emit
```

### Frontend (Vite + React)
```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server (port 2590)
npm run build                  # Type-check and build for production
npm run preview                # Preview build output
npm run lint                   # Frontend ESLint
npm run typecheck              # TypeScript type checking without emit
```

### Testing
- Backend: Jest with ts-jest preset, tests in `backend/src/**/__tests__/**/*.ts`
- Frontend: No test framework currently configured

## Architecture Overview

This is an AI-assisted meeting intelligence platform with a **dual-server architecture**:

### Core Structure
```
frontend/          # React SPA (Vite, TypeScript, Tailwind CSS)
├── src/
│   ├── pages/     # Route-based page components
│   ├── components/ # Reusable UI components (Radix + custom)
│   ├── layout/    # Layout shells and providers
│   ├── hooks/     # Custom React hooks
│   ├── services/  # API client functions
│   └── types/     # TypeScript type definitions
backend/           # Express REST API (TypeScript, MongoDB)
├── src/
│   ├── routes/    # Express route handlers (/api/*)
│   ├── services/  # Business logic and external service integrations
│   ├── config/    # Database and app configuration
│   ├── utils/     # Utility functions and helpers
│   └── types/     # MongoDB schema types
base/              # Shared TypeScript contracts between frontend/backend
files/             # Audio file storage (served at /files/*)
```

### Key Architectural Patterns

#### Backend (Express)
- **MongoDB Integration**: Direct MongoDB driver with connection pooling
- **Route Organization**: Feature-based routing (`/api/meetings`, `/api/recordings`, `/api/hotwords`, `/api/segmentation`)
- **Service Layer**: Business logic separated from route handlers
- **File Management**: Local audio file serving with configurable base path via `RECORDING_FILE_DIR` (falls back to `files/`)
- **WebSocket Support**: Live recording service via `LiveRecorderService`
- **Environment Configuration**: `.env` support for MongoDB URI, service URLs, OpenAI keys

#### Frontend (React)
- **Component Architecture**:
  - Page components in `src/pages/`
  - Shared UI components in `src/components/ui/` (shadcn-based)
  - Feature components (Audio, Meetings) in dedicated subdirectories
- **State Management**:
  - React Context for recording panel state
  - Custom hooks for complex logic (`useAudioRecording`)
  - Event bus pattern for cross-component communication (`recordingPanelBus`)
- **Routing**: React Router v6 with route-based code splitting
- **Styling**: Tailwind CSS with custom design system, CSS animations, dark mode support
- **API Integration**: Direct fetch-based service functions in `src/services/`

#### Shared Contracts
- **Type System**: Shared TypeScript interfaces in `base/types.ts` ensure data consistency
- **Key Types**: `Meeting`, `Recording`, `SpeakerSegment`, `Hotword`, `SegmentationResponse`

### Development Workflow

#### Port Configuration
- Frontend: `http://localhost:2590` (Vite dev server)
- Backend: `http://localhost:2591` (Express API)
- **Echo Stream**: `http://localhost:2592` (Live recording service)
- **Echo Voices**: `http://localhost:2593` (Speaker segmentation service)
- **Echo Vault**: `http://localhost:2594` (Transcription service)
- **Echo Aligner**: `http://localhost:2595` (Text alignment service)
- Default API URL: Frontend calls `http://localhost:2591` (override with `VITE_API_BASE_URL`)

#### Data Flow
1. Frontend components call service functions (`src/services/`)
2. Services make HTTP requests to backend `/api/*` endpoints
3. Backend routes process requests via service layer
4. MongoDB operations handled through connection pool
5. Audio files served from `files/` directory via `/files/*` static routes

#### Key Features Implementation
- **Live Recording**: WebSocket-based real-time audio capture and transcription (Echo Stream service)
- **Speaker Diarization**: External service integration for speaker segmentation (Echo Voices service)
- **Meeting Management**: CRUD operations with status tracking and participant metadata
- **Audio Processing**: Upload, transcription, and AI-powered content polishing (Echo Vault service)
- **Text Alignment**: Audio-transcript synchronization with word-level timestamps (Echo Aligner service)
- **Hotword System**: Custom trigger word management for speech models
- **Health Monitoring**: Backend checks health of all external services on startup

### Important Development Notes

#### File Path Handling
- Use `@` alias for `frontend/src/` imports
- Use `@base` alias for shared `base/` types
- Backend audio file paths resolved via `getFilesBaseDir()` utility
- Static file serving prevents path traversal attacks

#### Component Patterns and coding styling
- Follow named function export pattern for React components
- Use default export only at the bottom of component files
- Prefer composition over inheritance
- Implement proper TypeScript types (avoid `any`)
- Prefer functions for pure logic, utilities, and stateless operations. Use classes only when you actually need object instances with state/behavior. Default to functions.

#### Design
- Avoid overdesign with gradients.
- Create tailwind util classes for common styles.

#### Environment Variables
- Backend: `MONGODB_URI`, `DB_NAME`, `RECORDING_FILE_DIR`, `SEED_DATA`, OpenAI keys, external service URLs
  - `SEGMENTATION_SERVICE_URL`: Echo Voices service URL (default: `http://localhost:2593`)
  - `TRANSCRIBE_SERVICE_URL`: Echo Vault service URL (default: `http://localhost:2594`)
  - `ALIGNER_SERVICE_URL`: Echo Aligner service URL (default: `http://localhost:2595`)
- Frontend: `VITE_API_BASE_URL` (prefix with `VITE_` for client-side access)
- Use `SEED_DATA=1 npm run dev` to populate mock data during development
