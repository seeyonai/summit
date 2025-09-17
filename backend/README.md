# Summit API

Backend API service for Summit AI meetings management.

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
  participants?: number;
  location?: string;
  tags?: string[];
}
```

### Recording
```typescript
interface Recording {
  id: string;
  file_path: string;
  filename: string;
  created_at: Date;
  duration?: number;
  file_size?: number;
  transcription?: string;
  speaker_segments?: SpeakerSegment[];
  num_speakers?: number;
  sample_rate?: number;
  channels?: number;
  format?: string;
}
```