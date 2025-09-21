# Shared Recording Components

This document describes the shared recording components created to eliminate duplicate code between `MeetingRecordings.tsx` and `RecordingList.tsx`.

## Components Created

### 1. `useAudioPlayback` Hook (`/hooks/useAudioPlayback.ts`)

A custom hook that manages audio playback state and provides playback controls.

```typescript
const { playingAudio, toggleAudioPlayback, stopAllAudio } = useAudioPlayback();
```

**Features:**
- Manages currently playing audio state
- Handles audio element creation and cleanup
- Provides toggle functionality with automatic pause of other audio
- Includes utility function `audioUrlFor(filename)` for generating audio URLs

### 2. `RecordingCard` Component (`/components/RecordingCard.tsx`)

A flexible card component for displaying recording information in grid layouts.

```typescript
<RecordingCard 
  recording={recording}
  variant="default" // or "combined" or "compact"
  showMeetingInfo={true}
  showTranscriptionPreview={false}
  actions={{
    onView: (recording, e) => { /* handle view */ },
    onAssociate: (recording, e) => { /* handle associate */ },
    onDownload: (recording, e) => { /* handle download */ },
    onDelete: (recording, e) => { /* handle delete */ }
  }}
  onClick={(recording) => { /* handle click */ }}
/>
```

**Props:**
- `recording`: Recording object (supports both base and frontend Recording types)
- `variant`: Visual style variant (`default`, `combined`, `compact`)
- `showMeetingInfo`: Whether to show meeting association info
- `showTranscriptionPreview`: Whether to show transcription preview
- `showActions`: Whether to show action buttons
- `actions`: Object with action handlers
- `onClick`: Handler for card click
- `className`: Additional CSS classes

**Features:**
- Audio waveform visualization with play/pause controls
- Recording metadata display (duration, file size, format)
- Transcription and speaker detection badges
- Meeting association display
- Customizable action buttons
- Responsive design

### 3. `RecordingListItem` Component (`/components/RecordingListItem.tsx`)

A horizontal list item component for displaying recordings in list layouts.

```typescript
<RecordingListItem 
  recording={recording}
  actions={{
    onAssociate: (recording, e) => { /* handle associate */ },
    onDownload: (recording, e) => { /* handle download */ },
    onDelete: (recording, e) => { /* handle delete */ }
  }}
  onClick={(recording) => { /* handle click */ }}
/>
```

**Props:**
- `recording`: Recording object
- `actions`: Object with action handlers
- `onClick`: Handler for item click
- `className`: Additional CSS classes

**Features:**
- Compact horizontal layout
- Circular play button
- Recording metadata and transcription preview
- Meeting association display
- Action buttons on the right

## Type Compatibility

The components support both recording types:
- `Recording` from `@base/types` (used in Meeting contexts)
- `Recording` from `@/types` (used in RecordingList contexts, extends base with `_id` and timestamps)

The components use runtime type checking (`'_id' in recording`) to handle both cases gracefully.

## Migration Examples

### Before (MeetingRecordings.tsx)
```typescript
// Had local implementations of:
// - toggleAudioPlayback function (37 lines)
// - formatDuration, formatFileSize, formatDate functions (20 lines)
// - RecordingCard component (120+ lines)
// - Audio state management (2 state variables)
```

### After (MeetingRecordings.tsx)
```typescript
import RecordingCard from '@/components/RecordingCard';
import { formatDuration } from '@/utils/formatHelpers';

// Combined recording
<RecordingCard 
  recording={combinedRecording} 
  variant="combined"
  showMeetingInfo={false}
/>

// Individual recordings
{recordings.map((recording) => (
  <RecordingCard 
    key={recording.filename} 
    recording={recording}
    showMeetingInfo={false}
  />
))}
```

### Before (RecordingList.tsx)
```typescript
// Had local implementations of:
// - toggleAudioPlayback function (25 lines)
// - RecordingCard component (150+ lines)
// - RecordingListItem component (100+ lines)
// - Audio state management (2 state variables)
```

### After (RecordingList.tsx)
```typescript
import RecordingCard from '@/components/RecordingCard';
import RecordingListItem from '@/components/RecordingListItem';

const recordingActions = {
  onAssociate: openAssociationModal,
  onDelete: deleteRecording
};

// Grid view
{filteredRecordings.map((recording) => (
  <RecordingCard 
    key={recording._id} 
    recording={recording}
    showMeetingInfo={true}
    showTranscriptionPreview={true}
    actions={recordingActions}
    onClick={handleRecordingClick}
  />
))}

// List view
{filteredRecordings.map((recording) => (
  <RecordingListItem 
    key={recording._id} 
    recording={recording}
    actions={recordingActions}
    onClick={handleRecordingClick}
  />
))}
```

## Code Reduction Summary

**Eliminated Duplicate Code:**
- ✅ Audio playback logic (60+ lines duplicated)
- ✅ Format helper functions (30+ lines duplicated)
- ✅ Audio URL generation (1 line duplicated)
- ✅ Recording card UI patterns (200+ lines similar)
- ✅ Audio state management patterns (identical)

**Total Reduction:** ~300+ lines of duplicate/similar code eliminated

**Benefits:**
- Single source of truth for recording display logic
- Consistent UI/UX across all recording views
- Easier maintenance and bug fixes
- Better type safety and reusability
- Follows DRY principles
