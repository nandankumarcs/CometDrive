'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Folder as FolderIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  RotateCcw,
  XCircle,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import { FileIcon } from './FileIcon';
import { useDriveStore, type ItemType } from '../../store/drive.store';

interface DriveItemProps {
  uuid: string;
  name: string;
  type: ItemType;
  mimeType?: string;
  size?: number;
  updatedAt: string;
  isSelected: boolean;
  isTrashed?: boolean;
  onNavigate?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onDeletePermanent?: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DriveItem({
  uuid,
  name,
  type,
  mimeType,
  size,
  updatedAt,
  isSelected,
  isTrashed,
  onNavigate,
  onTrash,
  onRestore,
  onDeletePermanent,
  onDownload,
  onPreview,
}: DriveItemProps) {
  const { viewMode, toggleSelectItem, openModal, openPreview } = useDriveStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDoubleClick = () => {
    if (type === 'folder' && onNavigate) onNavigate();
    else if (type === 'file') {
      // Check if previewable
      const isPreviewable =
        mimeType?.startsWith('image/') ||
        mimeType?.startsWith('video/') ||
        mimeType?.startsWith('audio/') ||
        mimeType === 'application/pdf' ||
        mimeType?.startsWith('text/') ||
        mimeType === 'application/json';

      if (isPreviewable) {
        openPreview({ uuid, name, mimeType: mimeType || 'application/octet-stream' });
      } else if (onDownload) {
        onDownload();
      }
    }
  };

  const handleRename = () => {
    setMenuOpen(false);
    openModal('rename', { uuid, name, type });
  };

  const handleShare = () => {
    setMenuOpen(false);
    openModal('share', { uuid, name, type });
  };

  const handleConfirmDelete = () => {
    setMenuOpen(false);
    openModal('delete', { uuid, name, type });
  };

  // ─── Grid View ───
  if (viewMode === 'grid') {
    return (
      <div
        className={`group relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected
            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 shadow-md'
            : 'border-transparent bg-white dark:bg-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700'
        }`}
        onDoubleClick={handleDoubleClick}
        onClick={() => toggleSelectItem({ uuid, name, type })}
      >
        {/* Action menu */}
        <div
          ref={menuRef}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <ContextMenu
              {...{
                isTrashed,
                type,
                handleRename,
                onTrash,
                onRestore,
                handleConfirmDelete,
                onDownload,
                onPreview:
                  type === 'file'
                    ? () =>
                        openPreview({
                          uuid,
                          name,
                          mimeType: mimeType || 'application/octet-stream',
                        })
                    : undefined,
                handleShare,
              }}
            />
          )}
        </div>

        {/* Icon */}
        <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          {type === 'folder' ? (
            <FolderIcon className="h-10 w-10 text-primary-500" />
          ) : (
            <FileIcon mimeType={mimeType || ''} className="h-10 w-10" />
          )}
        </div>

        {/* Name */}
        <span
          className="text-sm font-medium text-gray-900 dark:text-white truncate w-full text-center"
          title={name}
        >
          {name}
        </span>
        <span className="text-xs text-gray-400 mt-1">
          {type === 'file' && size ? formatSize(size) : formatDate(updatedAt)}
        </span>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div
      className={`group flex items-center px-4 py-3 rounded-lg cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onDoubleClick={handleDoubleClick}
      onClick={() => toggleSelectItem({ uuid, name, type })}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mr-3">
        {type === 'folder' ? (
          <FolderIcon className="h-5 w-5 text-primary-500" />
        ) : (
          <FileIcon mimeType={mimeType || ''} className="h-5 w-5" />
        )}
      </div>

      {/* Name */}
      <span
        className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate"
        title={name}
      >
        {name}
      </span>

      {/* Size */}
      <span className="w-24 text-xs text-gray-400 text-right hidden sm:block">
        {type === 'file' && size ? formatSize(size) : '—'}
      </span>

      {/* Date */}
      <span className="w-28 text-xs text-gray-400 text-right hidden md:block ml-4">
        {formatDate(updatedAt)}
      </span>

      {/* Actions */}
      <div
        ref={menuRef}
        className="relative ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <ContextMenu
            {...{
              isTrashed,
              type,
              handleRename,
              onTrash,
              onRestore,
              handleConfirmDelete,
              onDownload,
              onPreview:
                type === 'file'
                  ? () =>
                      openPreview({ uuid, name, mimeType: mimeType || 'application/octet-stream' })
                  : undefined,
              handleShare,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Context Menu dropdown ───
function ContextMenu({
  isTrashed,
  type,
  handleRename,
  onTrash,
  onRestore,
  handleConfirmDelete,
  onDownload,
  onPreview,
  handleShare,
}: {
  isTrashed?: boolean;
  type: ItemType;
  handleRename: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  handleConfirmDelete: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
  handleShare: () => void;
}) {
  const cls = 'flex items-center w-full px-3 py-2 text-sm text-left transition-colors';
  return (
    <div className="absolute right-0 top-8 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20">
      {isTrashed ? (
        <>
          {onRestore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore();
              }}
              className={`${cls} text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Restore
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConfirmDelete();
            }}
            className={`${cls} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
          >
            <XCircle className="h-4 w-4 mr-2" /> Delete Forever
          </button>
        </>
      ) : (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRename();
            }}
            className={`${cls} text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            <Pencil className="h-4 w-4 mr-2" /> Rename
          </button>
          {onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className={`${cls} text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
            >
              <FileText className="h-4 w-4 mr-2" /> Preview
            </button>
          )}
          {type === 'file' && onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className={`${cls} text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
            >
              <Download className="h-4 w-4 mr-2" /> Download
            </button>
          )}
          {type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className={`${cls} text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
            >
              <LinkIcon className="h-4 w-4 mr-2" /> Share
            </button>
          )}
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          {onTrash && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrash();
              }}
              className={`${cls} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Move to Trash
            </button>
          )}
        </>
      )}
    </div>
  );
}
