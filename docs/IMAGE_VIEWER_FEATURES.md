# Image Viewer Feature Roadmap

This document tracks the image-viewer scope so we can implement and test in phases.

## Phase 1 (Implemented)

- [x] Dedicated `ImageViewer` component for `image/*` previews
- [x] Zoom in / zoom out controls
- [x] Mouse-wheel zoom
- [x] Pan by drag
- [x] Fit-to-screen mode
- [x] Fit-width mode
- [x] Actual-size mode (100%)
- [x] Rotate left / right
- [x] Flip horizontal / vertical
- [x] Reset view state
- [x] Fullscreen toggle
- [x] Keyboard shortcuts for core actions
- [x] Next/previous image navigation inside current filtered list
- [x] Playwright browser test coverage for core controls and image navigation

## Phase 2 (Next)

- [ ] Minimap navigator for large zoomed images
- [x] Smooth zoom-to-cursor behavior
- [x] Zoom presets (25/50/100/200/400%)
- [ ] Slideshow mode (play/pause, speed)
- [ ] Touch gestures (pinch, swipe)
- [ ] Better keyboard help overlay
- [ ] Per-image viewer-state persistence while modal is open

## Phase 3

- [ ] EXIF metadata panel (camera, lens, ISO, date, GPS)
- [ ] Histogram (RGB + luminance)
- [ ] Favorites / rating shortcuts from preview
- [ ] Side-by-side compare mode
- [ ] Annotation primitives (arrow, text, rectangle)
- [ ] Non-destructive quick edits (crop, rotate, brightness/contrast)

## Phase 4

- [ ] Similar-image lookup
- [ ] Duplicate / near-duplicate detector
- [ ] OCR text search inside images
- [ ] Shareable review links with comments and permissions
- [ ] Version history and annotation audit trail
