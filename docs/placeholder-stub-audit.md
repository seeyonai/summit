# Placeholder & Stub Audit

This document lists placeholder pages/components and dummy or not‑yet‑implemented functions found under `frontend/` and `backend/`.

## Summary
- Group chat UI in the frontend is a placeholder (“开发中/即将推出”).
- Verbatim transcript generation in backend returns a placeholder string (“待实现”).
- Todo advice endpoint returns a static, template response (stub).

## Frontend

- Group chat placeholder component
  - `frontend/src/components/Audio/TranscriptArea/GroupChatPlaceholder.tsx:16` — Badge text shows “即将推出”.
  - `frontend/src/components/Audio/TranscriptArea/GroupChatPlaceholder.tsx:22` — Copy says “群聊功能正在开发中，敬请期待”.
  - `frontend/src/components/Audio/TranscriptArea/TranscriptArea.tsx:77` — Renders `GroupChatPlaceholder` when `showGroupChat` is true.
  - `frontend/src/components/Audio/SettingsDialog.tsx:88` — Setting description notes “显示群聊消息面板（开发中）”.

- Minor UI placeholder (icon only)
  - `frontend/src/pages/Hotwords/HotwordListPage.tsx:182` — Commented “icon placeholder” in empty state.

Notes:
- “Skeleton” components (e.g., loading UIs in Meeting/Recording lists) are intentional loading placeholders, not unimplemented features.
- `ThemeContext`’s default `toggleTheme: () => {}` is a safe default; the real implementation is provided by `ThemeProvider`.

## Backend

- Verbatim transcript generation (placeholder output)
  - `backend/src/routes/meetings/index.ts:203` — Sets `recording.verbatimTranscript` to a placeholder string containing “[逐字稿 - 待实现] … 这里将会生成…”.

- AI advice for todo (stubbed/static response)
  - `backend/src/routes/meetings/index.ts:271` — Endpoint for `/:meetingId/todo-advice` exists.
  - `backend/src/routes/meetings/index.ts:284` — Returns a static, templated “AI建议” string (no real model call).

## Recommendations
- Replace the group chat placeholder with a feature‑flagged implementation plan (backend socket + message store) or hide the toggle until ready.
- Implement verbatim transcript generation (e.g., preserve disfluencies/pauses or integrate actual diarized text builder).
- Wire the todo advice endpoint to a real LLM/service and add input validation, rate limiting, and telemetry.

