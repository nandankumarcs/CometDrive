# CometDrive Feature Roadmap

This document outlines the planned features and implementation strategies for the CometDrive application.

## 1. Search and Filtering

Allows users to quickly locate files and organize their view.

- **Backend**: Update `findAll` endpoints to support `search` (text), `type` (mime), `sort` (field), and `order` (asc/desc).
- **Frontend**: Add a search bar and filter/sort controls to the `DriveToolbar`. State will be managed via URL query params or `DriveStore`.

## 2. Starred Items (Favorites)

Quick access to frequently used items.

- **Schema**: Add `is_starred` boolean column to `files` and `folders` tables.
- **API**: Add endpoints to toggle star status.
- **UI**:
  - Add Star icon to items.
  - Add "Starred" section in the main Sidebar.
  - Add Context Menu actions.

## 3. File Details & Management

Enhanced metadata visibility and bulk actions.

- **Details Panel**: A toggleable right sidebar showing full metadata (Owner, Dates, Size, Type, Location).
- **Multi-select Download**: Ability to download multiple selected files as a single ZIP archive.

## 4. Future Enhancements (Backlog)

- **Shared with Me**: Dedicated view for items shared by other users.
- **Storage Quota Visualization**: Progress bar showing usage limits.
- **Thumbnail Generation**: Server-side generation of thumbnails for images/videos.
