import { create } from "zustand";

type ModalMode = "create" | "edit";

type UIState = {
  nodeModalOpen: boolean;
  nodeModalMode: ModalMode;
  editingNodeId: number | null;
  quickCommandModalOpen: boolean;
  editingQuickCommandId: number | null;
  openNodeCreateModal: () => void;
  openNodeEditModal: (nodeId: number) => void;
  closeNodeModal: () => void;
  openQuickCommandCreateModal: () => void;
  openQuickCommandEditModal: (commandId: number) => void;
  closeQuickCommandModal: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  nodeModalOpen: false,
  nodeModalMode: "create",
  editingNodeId: null,
  quickCommandModalOpen: false,
  editingQuickCommandId: null,
  openNodeCreateModal: () =>
    set({
      nodeModalOpen: true,
      nodeModalMode: "create",
      editingNodeId: null,
    }),
  openNodeEditModal: (nodeId) =>
    set({
      nodeModalOpen: true,
      nodeModalMode: "edit",
      editingNodeId: nodeId,
    }),
  closeNodeModal: () => set({ nodeModalOpen: false, editingNodeId: null }),
  openQuickCommandCreateModal: () =>
    set({
      quickCommandModalOpen: true,
      editingQuickCommandId: null,
    }),
  openQuickCommandEditModal: (commandId) =>
    set({
      quickCommandModalOpen: true,
      editingQuickCommandId: commandId,
    }),
  closeQuickCommandModal: () =>
    set({
      quickCommandModalOpen: false,
      editingQuickCommandId: null,
    }),
}));
