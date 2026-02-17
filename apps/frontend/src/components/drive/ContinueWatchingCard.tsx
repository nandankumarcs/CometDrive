'use client';

import { Clock3, Play, X } from 'lucide-react';
import { useDismissPlaybackProgress, useContinueWatching } from '../../hooks/use-video-progress';
import { useDriveStore } from '../../store/drive.store';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ContinueWatchingCard() {
  const { data, isLoading } = useContinueWatching(true);
  const dismiss = useDismissPlaybackProgress();
  const { openPreview } = useDriveStore();

  if (isLoading || !data) {
    return null;
  }

  const handleResume = () => {
    openPreview({
      uuid: data.file.uuid,
      name: data.file.name,
      mimeType: data.file.mime_type,
    });
  };

  const handleDismiss = async () => {
    try {
      await dismiss.mutateAsync(data.file.uuid);
    } catch (error) {
      // Non-blocking UX; keep card visible if request fails.
      console.error('Failed to dismiss continue watching item:', error);
    }
  };

  return (
    <div
      className="mx-2 mb-3 rounded-xl border border-primary-200/70 bg-primary-50/80 p-4 dark:border-primary-900/40 dark:bg-primary-900/10"
      data-testid="continue-watching-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
            <Clock3 className="h-3.5 w-3.5" />
            Continue Watching
          </p>
          <h3
            className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
            title={data.file.name}
          >
            {data.file.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            {formatTime(data.positionSeconds)} / {formatTime(data.durationSeconds)}
          </p>
        </div>

        <button
          onClick={handleDismiss}
          disabled={dismiss.isPending}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-700 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          title="Dismiss"
          aria-label="Dismiss continue watching"
          data-testid="continue-watching-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary-100 dark:bg-primary-950/60">
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, data.progressPercent))}%` }}
        />
      </div>

      <button
        onClick={handleResume}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        data-testid="continue-watching-resume"
      >
        <Play className="h-4 w-4 fill-current" />
        Resume
      </button>
    </div>
  );
}
