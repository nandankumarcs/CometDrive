import React, { useState } from 'react';
import { useComments, useCreateComment, useDeleteComment } from '../../hooks/use-comments';
import { useAuthStore } from '../../store/auth.store';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send, Trash2, MessageSquare } from 'lucide-react';

export interface CommentsPanelProps {
  resourceType: 'file' | 'folder';
  resourceUuid: string;
  onSeek?: (time: number) => void;
  currentTime?: number;
}

export function CommentsPanel({
  resourceType,
  resourceUuid,
  onSeek,
  currentTime,
}: CommentsPanelProps) {
  const { data: comments, isLoading } = useComments(resourceType, resourceUuid);
  const createComment = useCreateComment(resourceType, resourceUuid);
  const deleteComment = useDeleteComment(resourceType, resourceUuid);
  const { user } = useAuthStore();

  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createComment.mutate(
      {
        content: newComment,
        // if currentTime is passed and > 0, we can save it as video timestamp metadata
        metadata: currentTime && currentTime > 0 ? { timestamp: currentTime } : undefined,
      },
      {
        onSuccess: () => {
          setNewComment('');
        },
      },
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 p-4">
        <MessageSquare className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Comments</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : comments?.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments?.map((comment) => (
            <div key={comment.uuid} className="group flex gap-3">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-medium">
                {comment.user.first_name[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {comment.user.first_name} {comment.user.last_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {comment.user.uuid === user?.uuid && (
                    <button
                      onClick={() => deleteComment.mutate(comment.uuid)}
                      disabled={deleteComment.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity disabled:opacity-50"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-300 wrap-break-word">
                  {comment.metadata?.timestamp !== undefined && (
                    <button
                      onClick={() => onSeek?.(comment.metadata.timestamp)}
                      className="mr-2 inline-flex items-center rounded bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                    >
                      {formatTime(comment.metadata.timestamp)}
                    </button>
                  )}
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            disabled={createComment.isPending}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || createComment.isPending}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white"
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
