# Summit

AI-assisted meeting intelligence platform combining a Vite + React frontend with an Express + MongoDB API. The toolkit streamlines meeting preparation, recording, transcription, diarization, and follow-up tasks.

## Highlights
- **Meeting lifecycle management** – create, monitor, and update meetings, including status dashboards and participant metadata.
- **Recording operations** – trigger mock recordings, manage uploaded audio, and associate files with meetings.
- **Hotword curation** – maintain a reusable catalog of trigger words for speech models.
- **Speaker segmentation** – upload audio or reuse stored recordings to run diarization with optional speaker-count hints.
- **Offline transcription sandbox** – prototype file-based transcription flows without live capture.
- **Shared contracts** – TypeScript models power both the API and UI for consistent data handling.

## Tech Stack
- **Frontend**: Vite, React 18, TypeScript, Tailwind CSS, Radix UI primitives.
- **Backend**: Express, TypeScript, MongoDB driver, Multer, Jest + ts-jest.
- **Tooling**: ESLint, TSConfig project references, shadcn-based UI components, FormData + Fetch clients.

## Architecture Overview
```
frontend (Vite @ http://localhost:2590)
  ↳ consumes REST APIs exposed by the backend
backend/api (Express @ http://localhost:2591)
  ↳ MongoDB persistence layer
  ↳ Serves audio assets from /files
files/
  ↳ Generated and seeded audio artifacts
```

## Directory Structure
```
frontend/        # React application (pages under src/pages, shared UI in src/components & src/layout)
backend/         # Express + MongoDB service (routes, services, config, types)
files/           # Local audio assets exposed via the API and seeder
base/            # Shared TypeScript contracts
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Local MongoDB instance (default URI `mongodb://localhost:27017`) or a compatible connection string.

### Backend Setup (`backend/`)
```bash
cd backend
npm install        # now includes dotenv for environment variable loading
npm run dev         # starts TSX watcher on http://localhost:2591
```
Optional steps:
- `npm run build` → emit JavaScript to `dist/` for production.
- `npm start` → run the built server.
- `npm run lint` → ESLint across `src/`.
- `npm test` → Jest suite (stubs MongoDB).
- Seed mock data by starting with `SEED_DATA=1 npm run dev` (expects sample audio under `files/`).

### Frontend Setup (`frontend/`)
```bash
cd frontend
npm install
npm run dev         # serves http://localhost:2590 with Vite
```
Additional commands:
- `npm run build` → type-check then build static assets.
- `npm run preview` → preview the build output.
- `npm run lint` → frontend ESLint configuration.

Override the API base URL by setting `VITE_API_BASE_URL` in the frontend's `.env` file.

### Concurrent Development
Start the backend first (port 2591), then the frontend (port 2590). The UI calls the API via hard-coded `http://localhost:2591` endpoints; set up a proxy or expose a `VITE_` env var if you need a different origin.

## Environment Configuration
- Backend honors `MONGODB_URI`, `DB_NAME`, and optional `SEED_DATA` flags (add an `.env` under `backend/` if needed).
- Frontend consumes `VITE_`-prefixed env vars via `import.meta.env`. Create `frontend/.env` to override defaults (e.g., `VITE_API_BASE_URL`).
- Store large or generated audio in `files/`; the Express server exposes it at `/files/*`.

## API Surface (Backend)
Base URL: `http://localhost:2591`

- `GET /health` – service + database status.
- **Meetings** (`/api/meetings`): CRUD operations, status filters, upcoming meetings, association with recordings.
- **Recordings** (`/api/recordings`): list, detail, mock start, delete, transcription (`/transcribe`), diarization (`/segment`), and transcription polishing (`/polish`).
- **Hotwords** (`/api/hotwords`): create, update, delete, batch fetch.
- **Segmentation** (`/api/segmentation`): model metadata, diarization by stored path (`/analyze`), upload-and-analyze (`/upload`).
- Static audio files are available at `/files/<filename>`.

OpenAPI draft specs for offline transcription live under `backend/openapi/`.

## Frontend Routes & Features
- `/` – Dashboard with welcome tiles, quick recording widget, and meeting summaries.
- `/recordings` – Recording management list, association flow, and detail links.
- `/meetings` – Meeting CRUD UI plus status tagging and Chinese-language copy.
- `/meetings/:id` – Detailed meeting view (transcripts, todos, recordings).
- `/hotwords` – Hotword CRUD management experience.
- `/segmentation` – Speaker diarization workflow for uploads or existing recordings.
- `/offline` – Offline transcription sandbox supporting file upload or stored recordings.
- `/tools` – Landing page for utilities (segmentation and offline transcription shortcuts).

The UI is built with shared components in `src/components`, layout shells in `src/layout`, API clients in `src/services`, and domain types in `src/types`. The project enforces two-space indentation, single quotes, and trailing semicolons via ESLint.

## Data & Seeding
- Sample audio referenced by the seeder must live in the repository-level `files/` directory.
- `DataSeeder` in `backend/src/utils/seedData.ts` populates meetings, hotwords, and recordings when `SEED_DATA` is truthy.
- Mongo collections are defined in `backend/src/types/mongodb.ts`; shared DTOs live in `base/types.ts` and `backend/src/types/`.
