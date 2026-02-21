# Video Player Chat Brief

Last updated: 2026-02-17

## Current Status

- Frontend dev server: `http://localhost:3003`
- Backend dev server: `http://localhost:3002/api`
- Swagger: `http://localhost:3002/api/docs`

## Goal

Implement the next set of video player enhancements in priority order from easiest to most complex.

## Priority Plan (Easy -> Complex)

1. Continue Watching card
2. Accessibility pass (ARIA labels, keyboard/focus improvements, screen-reader announcements)
3. Subtitle UX upgrades (toggle, track switcher, font size/style controls)
4. Bookmark moments (save timestamps and quick jump)
5. A-B repeat loop
6. Screenshot capture from current frame
7. Mobile gestures (double-tap seek, swipe volume/brightness)
8. Playback analytics events (start/pause/seek/buffer/complete)
9. Chapters and chapter navigation
10. Mini-player mode across route changes
11. Seek-bar thumbnail previews
12. Adaptive retry and source fallback handling
13. Audio track/language selector
14. Quality selector with adaptive streaming (HLS/DASH)
15. Cast support (Chromecast/AirPlay)

## Recommended Delivery Phases

- Phase 1 (fast wins): 1, 2, 3
- Phase 2: 4, 5, 6
- Phase 3: 7, 8, 9
- Phase 4: 10, 11, 12
- Phase 5: 13, 14, 15

## Quick Start Commands

From workspace root:

```bash
# Frontend
cd apps/frontend && npx next dev -p 3003

# Backend
APP_PORT=3002 npx nx serve backend
```

## Notes For New Chat Threads

- Ask to "start Phase 1 from VIDEO_PLAYER_CHAT_BRIEF.md".
- If implementing advanced streaming features, align backend APIs first (quality variants, manifest endpoints, analytics ingest endpoint).
- Keep Playwright coverage updated after each phase.
