# Summit API

Backend API service for Summit AI meetings management.

## Environment Setup

Create a `.env` file in the root of the backend directory based on `.env.example`:

```bash
# Copy the example file to create your own environment configuration
cp .env.example .env
```

Then modify the values in `.env` as needed for your development environment.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run tests
npm test
```


## API Endpoints

### Base URL: `http://localhost:2591`

#### Health Check
- `GET /health` - Health check

#### Config
- `GET /api/config` - Global customization config (reads `backend/customization.json`)

#### Meetings
- `GET /api/meetings` - Get all meetings
- `GET /api/meetings/:id` - Get meeting by ID
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `GET /api/meetings/status/:status` - Get meetings by status
- `GET /api/meetings/upcoming` - Get upcoming meetings

#### Recordings
- `POST /api/meetings/:id/recordings` - Add recording to meeting
- `DELETE /api/meetings/:id/recordings/:recordingId` - Remove recording from meeting

## Data Models

### Meeting
```typescript
interface Meeting {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
  scheduled_start?: Date;
  scheduled_end?: Date;
  actual_start?: Date;
  actual_end?: Date;
  recordings: Recording[];
  location?: string;
  tags?: string[];
}
```

### Recording
```typescript
interface Recording {
  _id: string;
  createdAt: Date;
  updatedAt?: Date;
  // Original uploaded filename (uploads only)
  originalFileName?: string;
  duration?: number;
  fileSize?: number;
  transcription?: string;
  speakerSegments?: SpeakerSegment[];
  numSpeakers?: number;
  sampleRate?: number;
  channels?: number;
  format?: string; // e.g. 'wav'
  source?: 'live' | 'upload';
}
```

Files are stored on disk within `RECORDING_FILE_DIR` (defaults to the repository `files/` folder) using the document `_id` as the base filename: `<_id>.<ext>`. Stream audio via `GET /files/:id`.
