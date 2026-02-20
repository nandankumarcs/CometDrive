# Team Collaboration Phase Implementation Plan

## Summary

This document tracks the phased execution of the Team Collaboration roadmap. Each phase is implemented, built, unit tested, verified in browser, and committed before moving to the next phase.

## Phase Workflow (Required)

1. Implement phase scope (backend + frontend + migrations, if applicable).
2. Build backend and frontend.
3. Run unit tests.
4. Verify in browser with the phase checklist.
5. Commit the phase changes.

## Build + Test Commands (Baseline)

- Backend build: `cd /Users/mac/comet/node-fullstack-boilerplate/apps/backend && npx webpack-cli build --node-env=prod`
- Frontend build: `cd /Users/mac/comet/node-fullstack-boilerplate/apps/frontend && npx next build`
- Backend unit tests: `npx jest --config /Users/mac/comet/node-fullstack-boilerplate/apps/backend/jest.config.cts`
- Frontend unit tests: `npx jest --config /Users/mac/comet/node-fullstack-boilerplate/apps/frontend/jest.config.cts`

## Phase 0: Baseline and Guardrails

### Goal

Create scaffolding, placeholders, and feature flags needed for later phases while keeping existing behavior intact.

### Scope

- Add a feature-flag config layer for collaboration features.
- Add minimal DTO/service/entity placeholders where needed (no behavior changes).
- Add plan file to `docs/`.
- Ensure build and tests still pass.

### Deliverables

1. Feature-flag constants and wiring (backend + frontend).
2. Placeholder modules/DTOs for upcoming features (notifications/comments/approvals/versions/2FA) with no runtime impact.
3. This phase plan file committed.

### Verification Checklist

- Login works.
- Drive list, upload, preview, share modal, starred, and trash pages still behave as before.

### Commit

`chore(collab): add phase-0 scaffolding and feature flags`

---

## Phase 1: Share Management Completion

- Complete folder sharing UI + permission edits.
- Backend endpoint to edit share permission/expiry.
- Tests for permission transitions.

## Phase 2: Public Link Hardening

- Add public download endpoint.
- Add expiry presets, optional password, and download toggle.
- Tests for expiry/password enforcement.

## Phase 3: Notifications Center

- Notification entity, API, and header dropdown.
- Mark read/unread support.

## Phase 4: Universal Comments

- Comments on files/folders (not just video).
- Mention parsing and permission checks.

## Phase 5: Approval Workflow

- Request/approve/changes requested flow.
- Approval panel in details/preview.

## Phase 6: File Version History

- New version on replace.
- Restore old versions.

## Phase 7: Security and Admin Visibility

- 2FA setup + verification + disable.
- Admin dashboard with share/activity metrics.
