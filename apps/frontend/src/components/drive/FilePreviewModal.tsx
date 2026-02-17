'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useFiles, useDownloadFile } from '../../hooks/use-files';
import { usePlaybackProgress, useUpdatePlaybackProgress } from '../../hooks/use-video-progress';
import api from '../../lib/api';
import { VideoPlayer } from './VideoPlayer';

export function FilePreviewModal() {
  const { previewItem, closePreview, currentFolderUuid, openPreview } = useDriveStore();
  const { data: files } = useFiles(currentFolderUuid);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const { mutate: updatePlaybackProgress } = useUpdatePlaybackProgress();

  // Playlist Logic
  const videoFiles = files?.filter((f) => f.mime_type.startsWith('video/')) || [];
  const currentVideoIndex = previewItem
    ? videoFiles.findIndex((f) => f.uuid === previewItem.uuid)
    : -1;
  const hasNext = currentVideoIndex !== -1 && currentVideoIndex < videoFiles.length - 1;
  const hasPrev = currentVideoIndex > 0;

  const handleNext = useCallback(() => {
    if (hasNext) {
      const nextFile = videoFiles[currentVideoIndex + 1];
      openPreview({ uuid: nextFile.uuid, name: nextFile.name, mimeType: nextFile.mime_type });
    }
  }, [currentVideoIndex, hasNext, openPreview, videoFiles]);

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      const prevFile = videoFiles[currentVideoIndex - 1];
      openPreview({ uuid: prevFile.uuid, name: prevFile.name, mimeType: prevFile.mime_type });
    }
  }, [currentVideoIndex, hasPrev, openPreview, videoFiles]);

  const downloadFile = useDownloadFile();
  const isVideoPreview = !!previewItem && previewItem.mimeType.startsWith('video/');
  const { data: playbackProgress } = usePlaybackProgress(previewItem?.uuid ?? '', isVideoPreview);

  const handleProgressSync = useCallback(
    (payload: { fileUuid: string; positionSeconds: number; durationSeconds: number }) => {
      updatePlaybackProgress(payload);
    },
    [updatePlaybackProgress],
  );

  useEffect(() => {
    if (!previewItem) {
      setSignedUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }

    const fetchUrl = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/files/${previewItem.uuid}/signed-url`);
        let url = res.data.data.url;

        // If local URL, append token
        if (url.startsWith('/api/v1/files/') && !url.includes('token=')) {
          // Get token from local storage manually since we are not using axios for the img src
          const raw = localStorage.getItem('auth-storage');
          if (raw) {
            const parsed = JSON.parse(raw);
            const token = parsed?.state?.accessToken;
            if (token) {
              url = `${url}?token=${token}`;
            }
          }
        }

        setSignedUrl(url);

        // For text files, fetch the content
        if (
          previewItem.mimeType.startsWith('text/') ||
          previewItem.mimeType === 'application/json' ||
          previewItem.mimeType === 'application/javascript'
        ) {
          const textRes = await fetch(url);
          const text = await textRes.text();
          setTextContent(text);
        }
      } catch (err) {
        console.error('Failed to load preview:', err);
        setError('Failed to load file preview');
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [previewItem]);

  if (!previewItem) return null;

  const handleDownload = () => {
    downloadFile.mutate(previewItem.uuid);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center text-white/70">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p>Loading preview...</p>
        </div>
      );
    }

    if (error || !signedUrl) {
      return (
        <div className="flex flex-col items-center justify-center text-white/70">
          <AlertCircle className="h-16 w-16 mb-4 text-red-400" />
          <p className="text-lg">{error || 'Preview unavailable'}</p>
        </div>
      );
    }

    const { mimeType } = previewItem;

    if (mimeType.startsWith('image/')) {
      return (
        <img
          src={signedUrl}
          alt={previewItem.name}
          className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
        />
      );
    }

    if (mimeType.startsWith('video/')) {
      return (
        <VideoPlayer
          fileUuid={previewItem.uuid}
          src={signedUrl}
          mimeType={mimeType}
          autoPlay
          initialTimeSeconds={playbackProgress?.positionSeconds ?? 0}
          onProgressSync={handleProgressSync}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={hasNext}
          hasPrev={hasPrev}
        />
      );
    }

    if (mimeType.startsWith('audio/')) {
      return (
        <div className="bg-gray-900 p-8 rounded-2xl flex flex-col items-center justify-center min-w-[300px]">
          <div className="h-24 w-24 bg-primary-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <span className="text-4xl">🎵</span>
          </div>
          <audio controls className="w-full" autoPlay>
            <source src={signedUrl} type={mimeType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={`${signedUrl}#view=FitH`}
          className="w-full h-[85vh] bg-white rounded-md shadow-2xl"
          title="PDF Preview"
        />
      );
    }

    if (textContent !== null) {
      return (
        <div className="bg-white text-gray-900 p-8 rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-auto">
          <pre className="font-mono text-sm whitespace-pre-wrap wrap-break-word">{textContent}</pre>
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center text-white/80 bg-gray-800 p-12 rounded-xl">
        <FileText className="h-24 w-24 mb-6 text-gray-400" />
        <p className="text-xl font-medium mb-2">No preview available</p>
        <p className="text-sm text-gray-400 mb-8">
          This file type ({mimeType}) cannot be viewed directly.
        </p>
        <button
          onClick={handleDownload}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center transition-colors"
        >
          <Download className="h-5 w-5 mr-2" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
        <h2 className="text-white font-medium text-lg drop-shadow-md truncate max-w-xl pl-4 pointer-events-auto">
          {previewItem.name}
        </h2>
        <div className="flex items-center space-x-2 pointer-events-auto pr-4">
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={closePreview}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="w-full h-full flex items-center justify-center p-4 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePreview();
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
