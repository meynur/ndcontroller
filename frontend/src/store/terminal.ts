import { create } from "zustand";

export type TerminalPaneState = {
  nodeId: number;
  nodeName: string;
  status: "connecting" | "connected" | "closed" | "error";
  error?: string;
};

type TerminalStore = {
  panes: TerminalPaneState[];
  openPane: (pane: { nodeId: number; nodeName: string }) => void;
  closePane: (nodeId: number) => void;
  setPaneStatus: (nodeId: number, status: TerminalPaneState["status"], error?: string) => void;
};

export const useTerminalStore = create<TerminalStore>((set) => ({
  panes: [],
  openPane: ({ nodeId, nodeName }) =>
    set((state) => {
      const existing = state.panes.find((pane) => pane.nodeId === nodeId);
      if (existing) {
        return {
          panes: state.panes.map((pane) =>
            pane.nodeId === nodeId ? { ...pane, nodeName, status: pane.status, error: undefined } : pane,
          ),
        };
      }

      const next = [...state.panes, { nodeId, nodeName, status: "connecting" as const }];
      return { panes: next.slice(-4) };
    }),
  closePane: (nodeId) =>
    set((state) => ({
      panes: state.panes.filter((pane) => pane.nodeId !== nodeId),
    })),
  setPaneStatus: (nodeId, status, error) =>
    set((state) => ({
      panes: state.panes.map((pane) =>
        pane.nodeId === nodeId ? { ...pane, status, error } : pane,
      ),
    })),
}));
