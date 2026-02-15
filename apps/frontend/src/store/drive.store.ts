import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list';
export type ModalType = 'newFolder' | 'rename' | 'delete' | 'share' | 'upload' | null;
export type ItemType = 'file' | 'folder';

export interface BreadcrumbItem {
  uuid: string | null;
  name: string;
}

export interface ContextItem {
  uuid: string;
  name: string;
  type: 'file' | 'folder';
}

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface DriveState {
  currentFolderUuid: string | null;
  viewMode: ViewMode;
  selectedItems: ContextItem[];
  searchQuery: string;
  sortBy: 'name' | 'size' | 'date';
  sortOrder: 'ASC' | 'DESC';
  filterType: string | null;
  isStarred: boolean;

  breadcrumbs: BreadcrumbItem[];
  activeModal: ModalType;
  contextItem: ContextItem | null;
  previewItem: { uuid: string; name: string; mimeType: string } | null;
  isSidebarOpen: boolean;

  // Uploads
  uploads: Record<string, UploadItem>;

  setCurrentFolder: (uuid: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSelectItem: (item: ContextItem) => void;
  selectAll: (items: ContextItem[]) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'name' | 'size' | 'date') => void;
  setSortOrder: (order: 'ASC' | 'DESC') => void;
  setFilterType: (type: string | null) => void;
  setIsStarred: (isStarred: boolean) => void;
  navigateToFolder: (uuid: string | null, name: string) => void;
  navigateToBreadcrumb: (index: number) => void;
  resetBreadcrumbs: () => void;
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  openModal: (modal: ModalType, item?: ContextItem) => void;
  closeModal: () => void;
  openPreview: (item: { uuid: string; name: string; mimeType: string }) => void;
  closePreview: () => void;

  // Upload Actions
  addUpload: (id: string, name: string) => void;
  updateUploadProgress: (id: string, progress: number) => void;
  completeUpload: (id: string) => void;
  failUpload: (id: string, error?: string) => void;
  clearCompletedUploads: () => void;
}

export const useDriveStore = create<DriveState>()(
  devtools(
    (set) => ({
      currentFolderUuid: null,
      viewMode: 'grid',
      selectedItems: [],
      searchQuery: '',
      sortBy: 'date',
      sortOrder: 'DESC',
      filterType: null,
      isStarred: false,

      breadcrumbs: [{ uuid: null, name: 'My Drive' }],
      activeModal: null,
      contextItem: null,
      previewItem: null,
      isSidebarOpen: true,
      uploads: {},

      setCurrentFolder: (uuid) =>
        set({ currentFolderUuid: uuid, selectedItems: [], searchQuery: '' }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSelectItem: (item) =>
        set((state) => ({
          selectedItems: state.selectedItems.some((i) => i.uuid === item.uuid)
            ? state.selectedItems.filter((i) => i.uuid !== item.uuid)
            : [...state.selectedItems, item],
        })),
      selectAll: (items) => set({ selectedItems: items }),
      clearSelection: () => set({ selectedItems: [] }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setFilterType: (filterType) => set({ filterType }),
      setIsStarred: (isStarred) =>
        set({ isStarred, currentFolderUuid: null, breadcrumbs: [{ uuid: null, name: 'Starred' }] }),

      navigateToFolder: (uuid, name) => {
        set((state) => ({
          currentFolderUuid: uuid,
          breadcrumbs: [...state.breadcrumbs, { uuid, name }],
          selectedItems: [],
        }));
        // We need to access the router here, but this is a pure store.
        // We can't use hooks here.
        // The component calling this should handle navigation or we use a subscription?
        // OR we just rely on the component to change URL?
      },
      navigateToBreadcrumb: (index) =>
        set((state) => ({
          breadcrumbs: state.breadcrumbs.slice(0, index + 1),
          currentFolderUuid: state.breadcrumbs[index].uuid,
          selectedItems: [],
        })),
      resetBreadcrumbs: () =>
        set({ breadcrumbs: [{ uuid: null, name: 'My Drive' }], currentFolderUuid: null }),
      setBreadcrumbs: (items) => set({ breadcrumbs: items }),
      openModal: (modal, item) => set({ activeModal: modal, contextItem: item || null }),
      closeModal: () => set({ activeModal: null, contextItem: null }),
      openPreview: (item) => set({ previewItem: item }),
      closePreview: () => set({ previewItem: null }),

      addUpload: (id, name) =>
        set((state) => ({
          uploads: {
            ...state.uploads,
            [id]: { id, name, progress: 0, status: 'pending' },
          },
        })),
      updateUploadProgress: (id, progress) =>
        set((state) => ({
          uploads: {
            ...state.uploads,
            [id]: { ...state.uploads[id], progress, status: 'uploading' },
          },
        })),
      completeUpload: (id) =>
        set((state) => ({
          uploads: {
            ...state.uploads,
            [id]: { ...state.uploads[id], progress: 100, status: 'completed' },
          },
        })),
      failUpload: (id, error) =>
        set((state) => ({
          uploads: {
            ...state.uploads,
            [id]: { ...state.uploads[id], status: 'error', error },
          },
        })),
      clearCompletedUploads: () =>
        set((state) => {
          const newUploads = { ...state.uploads };
          Object.keys(newUploads).forEach((key) => {
            if (newUploads[key].status === 'completed') {
              delete newUploads[key];
            }
          });
          return { uploads: newUploads };
        }),
    }),
    { name: 'DriveStore' },
  ),
);
