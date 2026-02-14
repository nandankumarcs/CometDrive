import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list';

interface DriveState {
  currentFolderUuid: string | null;
  viewMode: ViewMode;
  selectedItems: string[];
  searchQuery: string;

  setCurrentFolder: (uuid: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSelectItem: (uuid: string) => void;
  selectAll: (uuids: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
}

export const useDriveStore = create<DriveState>()(
  devtools(
    (set) => ({
      currentFolderUuid: null,
      viewMode: 'grid',
      selectedItems: [],
      searchQuery: '',

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
    }),
    { name: 'DriveStore' },
  ),
);
