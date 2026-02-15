import { X, FileText, Folder, Database, Type } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useFolders } from '../../hooks/use-folders';
import { useFiles } from '../../hooks/use-files';

export function DetailsPanel() {
  const { selectedItems, currentFolderUuid, showDetails, toggleDetails } = useDriveStore();

  // We might want to fetch details if we only have summary data,
  // but for now let's use what we have in selectedItems or the store cache.
  // In a real app, we might query `useFile(uuid)` for full details.

  // Mock data or derived from selection
  const isMultiple = selectedItems.length > 1;
  const isSingle = selectedItems.length === 1;
  const isNone = selectedItems.length === 0;

  if (!showDetails) return null;

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          {isMultiple
            ? `${selectedItems.length} items selected`
            : isSingle
            ? selectedItems[0].name
            : 'Folder Details'}
        </h3>
        <button
          onClick={toggleDetails}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Preview / Icon Area */}
        <div className="flex justify-center py-6">
          {isMultiple ? (
            <div className="relative">
              <FileText className="w-24 h-24 text-gray-300 translate-x-2 translate-y-2" />
              <FileText className="w-24 h-24 text-gray-400 absolute top-0 left-0 -translate-x-2 -translate-y-2" />
            </div>
          ) : isSingle ? (
            selectedItems[0].type === 'folder' ? (
              <Folder className="w-32 h-32 text-primary-500" />
            ) : (
              <FileText className="w-32 h-32 text-gray-400" />
            )
          ) : (
            <Folder className="w-32 h-32 text-gray-300" />
          )}
        </div>

        {/* Metadata Grid */}
        <div className="space-y-4">
          {isSingle && (
            <>
              <DetailRow
                icon={Type}
                label="Type"
                value={
                  selectedItems[0].type === 'folder'
                    ? 'Folder'
                    : selectedItems[0].name.split('.').pop()?.toUpperCase() || 'File'
                }
              />
              <DetailRow
                icon={Database}
                label="Size"
                value={
                  selectedItems[0].type === 'file'
                    ? formatBytes((selectedItems[0] as any).size || 0)
                    : '-'
                }
              />
              {/* Add more details here if we have them in ContextItem or fetch them */}
            </>
          )}

          {isNone && (
            <div className="text-center text-gray-500">
              <p>Select an item to view details.</p>
              <p className="text-sm mt-2">Current Folder: {currentFolderUuid || 'My Drive'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
