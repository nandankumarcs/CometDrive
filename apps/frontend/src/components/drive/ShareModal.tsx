import { useEffect, useMemo, useState } from 'react';
import { Loader2, Link as LinkIcon, Copy, Trash2, Check, UserPlus } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import {
  type SharePermission,
  type ShareResourceType,
  useCreateShare,
  useGetShares,
  useRevokeShare,
  useUpdateShare,
} from '../../hooks/use-share';

export function ShareModal() {
  const { activeModal, contextItem, closeModal } = useDriveStore();
  const isOpen = activeModal === 'share';

  const resourceType: ShareResourceType | null =
    contextItem?.type === 'file' || contextItem?.type === 'folder' ? contextItem.type : null;
  const resourceUuid = contextItem?.uuid ?? null;

  const { data: shares = [], isLoading } = useGetShares(
    resourceType,
    resourceUuid,
    isOpen && !!resourceType && !!resourceUuid,
  );
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();
  const updateShare = useUpdateShare();

  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('viewer');
  const [copiedShareUuid, setCopiedShareUuid] = useState<string | null>(null);
  const [publicExpiresAt, setPublicExpiresAt] = useState<Date | null>(null);
  const [publicAllowDownload, setPublicAllowDownload] = useState(true);
  const [publicRequirePassword, setPublicRequirePassword] = useState(false);
  const [publicPassword, setPublicPassword] = useState('');
  const [publicError, setPublicError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPermission('viewer');
      setCopiedShareUuid(null);
      setPublicError(null);
    }
  }, [isOpen]);

  const { publicShare, privateShares } = useMemo(() => {
    const publicShareItem = shares.find((share) => share.recipient_id === null) ?? null;
    return {
      publicShare: publicShareItem,
      privateShares: shares.filter((share) => share.recipient_id !== null),
    };
  }, [shares]);

  useEffect(() => {
    if (!isOpen) return;
    setPublicExpiresAt(publicShare?.expires_at ? new Date(publicShare.expires_at) : null);
    setPublicAllowDownload(publicShare?.download_enabled ?? true);
    setPublicRequirePassword(Boolean(publicShare?.has_password));
    setPublicPassword('');
    setPublicError(null);
  }, [isOpen, publicShare?.uuid]);

  if (!isOpen || !resourceType || !resourceUuid) return null;

  const getShareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  const formatExpiry = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const handleCreatePublic = async () => {
    if (resourceType !== 'file') return;
    if (publicRequirePassword && !publicPassword.trim()) {
      setPublicError('Password is required when protection is enabled.');
      return;
    }
    await createShare.mutateAsync({
      resourceType,
      resourceUuid,
      expiresAt: publicExpiresAt ?? undefined,
      downloadEnabled: publicAllowDownload,
      password: publicRequirePassword ? publicPassword.trim() : undefined,
    });
    setPublicPassword('');
    setPublicError(null);
  };

  const handleCreatePrivate = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    await createShare.mutateAsync({
      resourceType,
      resourceUuid,
      recipientEmail: trimmedEmail,
      permission,
    });
    setEmail('');
  };

  const handleRevoke = async (shareUuid: string) => {
    await revokeShare.mutateAsync({ shareUuid, resourceType, resourceUuid });
  };

  const handleCopy = async (shareUuid: string, token: string) => {
    await navigator.clipboard.writeText(getShareUrl(token));
    setCopiedShareUuid(shareUuid);
    setTimeout(() => setCopiedShareUuid(null), 2000);
  };

  const applyPublicExpiry = async (days: number | null) => {
    const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
    setPublicExpiresAt(expiresAt);
    if (publicShare) {
      await updateShare.mutateAsync({ shareUuid: publicShare.uuid, expiresAt });
    }
  };

  const handlePublicDownloadToggle = async (enabled: boolean) => {
    setPublicAllowDownload(enabled);
    if (publicShare) {
      await updateShare.mutateAsync({ shareUuid: publicShare.uuid, downloadEnabled: enabled });
    }
  };

  const handlePublicPasswordSave = async () => {
    if (!publicShare) return;
    const trimmed = publicPassword.trim();
    if (!trimmed) {
      setPublicError('Enter a password to enable protection.');
      return;
    }
    await updateShare.mutateAsync({ shareUuid: publicShare.uuid, password: trimmed });
    setPublicPassword('');
    setPublicRequirePassword(true);
    setPublicError(null);
  };

  const handlePublicPasswordRemove = async () => {
    if (!publicShare) return;
    await updateShare.mutateAsync({ shareUuid: publicShare.uuid, password: '' });
    setPublicPassword('');
    setPublicRequirePassword(false);
    setPublicError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
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

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary-500" />
              <p>Loading shares...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-primary-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Share with a user
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as SharePermission)}
                    className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    onClick={handleCreatePrivate}
                    disabled={createShare.isPending || !email.trim()}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createShare.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
                  </button>
                </div>
              </div>

              {resourceType === 'file' && (
                <div className="space-y-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Public link</p>
                  {publicShare ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={getShareUrl(publicShare.token)}
                          className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none text-gray-600 dark:text-gray-300"
                        />
                        <button
                          onClick={() => handleCopy(publicShare.uuid, publicShare.token)}
                          className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                        >
                          {copiedShareUuid === publicShare.uuid ? (
                            <span className="inline-flex items-center gap-1">
                              <Check className="w-4 h-4 text-green-500" />
                              Copied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Copy className="w-4 h-4" />
                              Copy
                            </span>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleRevoke(publicShare.uuid)}
                        className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke public link
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreatePublic}
                      disabled={
                        createShare.isPending || (publicRequirePassword && !publicPassword.trim())
                      }
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Create public link
                    </button>
                  )}

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Expiry</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatExpiry(publicExpiresAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Never', value: null },
                        { label: '1 day', value: 1 },
                        { label: '7 days', value: 7 },
                        { label: '30 days', value: 30 },
                      ].map((option) => (
                        <button
                          key={option.label}
                          onClick={() => applyPublicExpiry(option.value)}
                          disabled={updateShare.isPending || createShare.isPending}
                          className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Allow downloads</span>
                      <input
                        type="checkbox"
                        checked={publicAllowDownload}
                        onChange={(e) => handlePublicDownloadToggle(e.target.checked)}
                        disabled={updateShare.isPending || createShare.isPending}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Require password</span>
                        <input
                          type="checkbox"
                          checked={publicRequirePassword}
                          onChange={(e) => setPublicRequirePassword(e.target.checked)}
                          disabled={updateShare.isPending || createShare.isPending}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </div>
                      {publicRequirePassword && (
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="Set a password"
                            value={publicPassword}
                            onChange={(e) => setPublicPassword(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          {publicShare && (
                            <button
                              onClick={handlePublicPasswordSave}
                              disabled={updateShare.isPending || !publicPassword.trim()}
                              className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      )}
                      {publicShare?.has_password && (
                        <button
                          onClick={handlePublicPasswordRemove}
                          disabled={updateShare.isPending}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove password
                        </button>
                      )}
                      {publicError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{publicError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  People with access
                </p>
                {privateShares.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No private shares yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {privateShares.map((share) => (
                      <div
                        key={share.uuid}
                        className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {share.recipient
                              ? `${share.recipient.first_name} ${share.recipient.last_name}`.trim()
                              : 'Shared user'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {share.recipient?.email ?? 'Email unavailable'}
                          </p>
                        </div>
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            updateShare.mutate({
                              shareUuid: share.uuid,
                              permission: e.target.value as SharePermission,
                            })
                          }
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={updateShare.isPending}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          onClick={() => handleRevoke(share.uuid)}
                          disabled={revokeShare.isPending || updateShare.isPending}
                          className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-60"
                        >
                          <Trash2 className="w-4 h-4" />
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
