import { useDriveStore } from '../../store/drive.store';
import { useCreateShare, useGetShare, useRevokeShare } from '../../hooks/use-share';
import { Loader2, Link as LinkIcon, Copy, Trash2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

// Fallback UI components if standard ones aren't available - usually passing props or using standard HTML/Tailwind
// Checking DriveItem might reveal UI lib usage.
// For now, I'll use standard Tailwind + HTML if I'm not sure about UI lib, or standard simple components.
// Actually, let's make it self-contained with Tailwind to avoid dependency issues if Shadcn isn't fully set up.

export function ShareModal() {
  const { activeModal, contextItem, closeModal } = useDriveStore();
  const isOpen = activeModal === 'share';
  const fileUuid = contextItem?.type === 'file' ? contextItem.uuid : null;

  const { data: share, isLoading, refetch } = useGetShare(fileUuid || '', isOpen && !!fileUuid);
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // URL generation
  const shareUrl = share ? `${window.location.origin}/share/${share.token}` : '';

  const handleCreate = async () => {
    if (!fileUuid) return;
    await createShare.mutateAsync({ fileUuid });
    refetch(); // Ensure we get the new share
  };

  const handleRevoke = async () => {
    if (!fileUuid) return;
    await revokeShare.mutateAsync(fileUuid);
    refetch();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary-500" />
              Share "{contextItem?.name}"
            </h3>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary-500" />
                <p>Loading share info...</p>
              </div>
            ) : share && share.is_active ? (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Link is active
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none text-gray-600 dark:text-gray-300"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Anyone with this link can download this file.
                  </p>
                  <button
                    onClick={handleRevoke}
                    disabled={revokeShare.isPending}
                    className="w-full py-2 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    {revokeShare.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Revoke Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <LinkIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">
                  Create a public link
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                  Generate a unique URL to share this file with anyone.
                </p>
                <button
                  onClick={handleCreate}
                  disabled={createShare.isPending}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {createShare.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Create Link'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
