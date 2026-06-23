import { create } from "zustand";

type SelectionState = {
  selectedNodeIds: number[];
  toggleNode: (nodeId: number) => void;
  setSelectedNodeIds: (nodeIds: number[]) => void;
  clearSelection: () => void;
  isSelected: (nodeId: number) => boolean;
};

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedNodeIds: [],
  toggleNode: (nodeId) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.includes(nodeId)
        ? state.selectedNodeIds.filter((id) => id !== nodeId)
        : [...state.selectedNodeIds, nodeId],
    })),
  setSelectedNodeIds: (nodeIds) => set({ selectedNodeIds: nodeIds }),
  clearSelection: () => set({ selectedNodeIds: [] }),
  isSelected: (nodeId) => get().selectedNodeIds.includes(nodeId),
}));
