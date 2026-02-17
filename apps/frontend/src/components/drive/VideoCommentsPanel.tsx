'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import {
  useCreateVideoComment,
  useDeleteVideoComment,
  useVideoComments,
} from '../../hooks/use-video-comments';

interface VideoCommentsPanelProps {
  fileUuid: string;
  currentTimeSeconds: number;
  onSeekToTimestamp: (seconds: number) => void;
}

function formatTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VideoCommentsPanel({
  fileUuid,
  currentTimeSeconds,
  onSeekToTimestamp,
}: VideoCommentsPanelProps) {
  const [content, setContent] = useState('');
  const { data: comments, isLoading, isError } = useVideoComments(fileUuid, !!fileUuid);
  const createComment = useCreateVideoComment();
  const deleteComment = useDeleteVideoComment();

  const timestampSeconds = useMemo(
    () => Math.max(0, Math.floor(currentTimeSeconds)),
    [currentTimeSeconds],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    await createComment.mutateAsync({
      fileUuid,
      content: trimmed,
      timestampSeconds,
    });
    setContent('');
  };

  return (
    <aside
      data-testid="video-comments-panel"
      className="w-full lg:w-96 h-full bg-gray-900/80 border border-white/10 rounded-lg text-white flex flex-col"
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments
        </h3>
        <span className="text-xs text-white/60">{comments?.length ?? 0}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-white/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {isError && <p className="text-sm text-red-300">Failed to load comments.</p>}

        {!isLoading && !isError && (!comments || comments.length === 0) && (
          <p className="text-sm text-white/60">No comments yet.</p>
        )}

        {comments?.map((comment) => (
          <div
            key={comment.uuid}
            data-testid="video-comment-item"
            className="bg-black/30 border border-white/10 rounded-md p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {comment.author.firstName} {comment.author.lastName}
                </p>
                <p className="text-xs text-white/50">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid="video-comment-timestamp"
                  type="button"
                  onClick={() => onSeekToTimestamp(comment.timestampSeconds)}
                  className="text-xs px-2 py-1 rounded bg-primary-600/80 hover:bg-primary-600 transition-colors"
                >
                  {formatTimestamp(comment.timestampSeconds)}
                </button>
                {comment.canDelete && (
                  <button
                    data-testid="video-comment-delete"
                    type="button"
                    onClick={() => deleteComment.mutate({ fileUuid, commentUuid: comment.uuid })}
                    className="p-1 text-white/60 hover:text-red-300 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-white/85 mt-2 whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 space-y-2">
        <p className="text-xs text-white/50">Posting at {formatTimestamp(timestampSeconds)}</p>
        <textarea
          data-testid="video-comment-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Add a comment"
          className="w-full rounded-md bg-black/40 border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          data-testid="video-comment-submit"
          type="submit"
          disabled={createComment.isPending || !content.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Comment
        </button>
      </form>
    </aside>
  );
}
