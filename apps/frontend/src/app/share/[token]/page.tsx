'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api'; // Fix import path based on location
import { Loader2, Download, File as FileIcon, AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';

interface SharedFile {
  uuid: string; // share uuid
  token: string;
  file: {
    uuid: string;
    name: string;
    mime_type: string;
    size: number;
    created_at: string;
    updated_at: string;
  };
  creator: {
    first_name: string;
    last_name: string;
  };
  is_active: boolean;
  expires_at: string | null;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;

  const {
    data: share,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-share', token],
    queryFn: async () => {
      // Need to make sure api client handles public requests without auth header if needed,
      // or we use a separate fetch instance.
      // Our api client attaches token if present, but for public page user might not have token.
      // That's fine.
      const res = await api.get<{ data: SharedFile }>(`/shares/public/${token}`);
      return res.data.data;
    },
    enabled: !!token,
    retry: false,
  });

  const handleDownload = async () => {
    if (!share) return;
    try {
      // We can use the same download endpoint as authenticated users if it allows public access via share token?
      // Or we need a specific public download endpoint?
      // The implementation plan didn't specify a public download endpoint, just "returns file metadata".
      // We need a way to download the file content.
      // Easiest is to add a public download endpoint in ShareController, or reuse FileController.download but with share token.

      // Let's assume for now we use a direct download link or a new endpoint.
      // Re-reading plan: "GET /shares/public/:token Returns file metadata and download URL" (in refined plan).
      // But my ShareController implementation just returned `share` object with file metadata.
      // `FileController` has `download`. It probably requires auth.

      // I should update ShareController to return a pre-signed URL or stream the file.
      // Or simply: Add `GET /shares/public/:token/download` endpoint.

      // For now, let's implement the UI and then fix the download logic.
      // If I click download, I can trigger a browser download from an endpoint.

      window.open(`${api.defaults.baseURL}/shares/public/${token}/download`, '_blank');
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading shared file...</p>
        </div>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Link Expired or Invalid
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The shared link you are trying to access does not exist or has been revoked by the
            owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Simple Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">CometDrive</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-6">
                <FileIcon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 break-all">
                {share.file.name}
              </h2>

              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Shared by{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {share.creator.first_name} {share.creator.last_name}
                </span>
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 w-full justify-center bg-gray-50 dark:bg-gray-900/50 py-3 rounded-lg">
                <div className="flex flex-col items-center px-4 border-r border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatSize(share.file.size)}
                  </span>
                  <span className="text-xs">Size</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <span
                    className="font-semibold text-gray-900 dark:text-white text-uppercase"
                    style={{ textTransform: 'uppercase' }}
                  >
                    {share.file.mime_type.split('/').pop()}
                  </span>
                  <span className="text-xs">Type</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download File
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
