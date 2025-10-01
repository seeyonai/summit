# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` (Vite + React + TypeScript) keeps views in `src/pages`, shared UI in `src/components` and `src/layout`, API clients in `src/services`, utilities in `src/utils`; use the `@/` alias from `tsconfig.json` for absolute imports.
- `backend/api/` hosts the Express + MongoDB service; keep HTTP entry points under `src/routes`, persistence logic in `src/services` and `src/config`, and shared contracts in `src/types`. The seeder in `src/utils/seedData.ts` expects audio under `/files`.
- `files/` stores generated audio served by the API, while each package emits build artifacts into a local `dist/` directory that should stay out of commits.

## Build, Test, and Development Commands
- Frontend: `cd frontend && npm install`, `npm run dev` (http://localhost:2590), `npm run build`, `npm run preview`, and `npm run lint` before sharing changes.
- Backend: `cd backend/api && npm install`, `npm run dev` for the TSX watcher on http://localhost:2591, `npm run build`, `npm start`, `npm run lint`, and `npm test` for the Jest suite.

## Coding Style & Naming Conventions
- Stick to TypeScript, two-space indentation, trailing semicolons, and single quotes; the ESLint configs enforce these defaults.
- Name React components and layout wrappers in PascalCase (`MeetingDetail`), hooks with a `use` prefix, and utilities in camelCase.
- Mirror REST resources in backend route filenames (e.g. `src/routes/recordings.ts`) and colocate helpers near their consumers to avoid long relatives; prefer the `@/` alias in the frontend.
- Prefer functions for pure logic, utilities, and stateless operations. Use classes only when you actually need object instances with state/behavior. Default to functions.

## Commit & Pull Request Guidelines
- Use Conventional Commit subjects (`feat:`, `refactor:`, `docs:`) with imperative, lower-case wording consistent with the current history.
- PRs should describe behaviour changes, list commands you ran, link tracking issues, and include UI screenshots when altering visible flows; keep scope narrow and flag any seeding or data migrations.

## Environment & Configuration
- The API honours `MONGODB_URI` and `DB_NAME`; add overrides in `backend/api/.env` and call out any seed data implications.
- The frontend reads runtime configuration from `VITE_`-prefixed variables via `import.meta.env`; avoid hard-coded URLs.
- Store any new development audio under `files/` and keep sensitive or production data out of the repository.

## Extra Rules

- Do not wrapping function parameters unless necessary.
- Prefer airbnb javascript coding style.
- When implementing new features, carefully search and reuse existing code.
- Try your best to avoid producing duplicate code.
- Never auto start dev server to test code.

## Frontend — React rules

### Component structure
- Plan pages by listing top-level sections; implement page-level component and split major sections into separate files.
- Break large components into smaller subcomponents and colocate related files in the same folder.
- Put custom components in `src/components` (not `src/components/ui`).
- Keep data-fetching separate from UI/presentational components.
- Use named function components and default-export them on the last line.
- File names: PascalCase (`.jsx`/`.tsx`).
- Avoid wrapping JSX props across lines unless a single line would exceed ~200 characters.

### useEffect guidance
- **Don't use `useEffect`** for: data transforms for render (use variables/`useMemo`), event handling (use handlers), resetting state on prop change (use `key` or compute during render), or deriving state from props/state (compute during render).
- **Use `useEffect` only** to sync with external systems (APIs, DOM, third-party libs) or for required cleanup on unmount.
