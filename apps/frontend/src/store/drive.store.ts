import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list';
export type ModalType = 'newFolder' | 'rename' | 'delete' | 'upload' | null;
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

interface DriveState {
  currentFolderUuid: string | null;
  viewMode: ViewMode;
  selectedItems: string[];
  searchQuery: string;
  breadcrumbs: BreadcrumbItem[];
  activeModal: ModalType;
  contextItem: ContextItem | null;

  setCurrentFolder: (uuid: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSelectItem: (uuid: string) => void;
  selectAll: (uuids: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  navigateToFolder: (uuid: string | null, name: string) => void;
  navigateToBreadcrumb: (index: number) => void;
  resetBreadcrumbs: () => void;
  openModal: (modal: ModalType, item?: ContextItem) => void;
  closeModal: () => void;
}

export const useDriveStore = create<DriveState>()(
  devtools(
    (set) => ({
      currentFolderUuid: null,
      viewMode: 'grid',
      selectedItems: [],
      searchQuery: '',
      breadcrumbs: [{ uuid: null, name: 'My Drive' }],
      activeModal: null,
      contextItem: null,

      setCurrentFolder: (uuid) => set({ currentFolderUuid: uuid, selectedItems: [] }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSelectItem: (uuid) =>
        set((state) => ({
          selectedItems: state.selectedItems.includes(uuid)
            ? state.selectedItems.filter((id) => id !== uuid)
            : [...state.selectedItems, uuid],
        })),
      selectAll: (uuids) => set({ selectedItems: uuids }),
      clearSelection: () => set({ selectedItems: [] }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      navigateToFolder: (uuid, name) =>
        set((state) => ({
          currentFolderUuid: uuid,
          breadcrumbs: [...state.breadcrumbs, { uuid, name }],
          selectedItems: [],
        })),
      navigateToBreadcrumb: (index) =>
        set((state) => ({
          breadcrumbs: state.breadcrumbs.slice(0, index + 1),
          currentFolderUuid: state.breadcrumbs[index].uuid,
          selectedItems: [],
        })),
      resetBreadcrumbs: () =>
        set({ breadcrumbs: [{ uuid: null, name: 'My Drive' }], currentFolderUuid: null }),
      openModal: (modal, item) => set({ activeModal: modal, contextItem: item || null }),
      closeModal: () => set({ activeModal: null, contextItem: null }),
    }),
    { name: 'DriveStore' },
  ),
);
