import { create } from "zustand";

import type { NodeStatsResponse, NodeStatuses, NodeStatus } from "../types/api";

type MonitoringStore = {
  statuses: NodeStatuses;
  statsByNodeId: Record<number, NodeStatsResponse>;
  setStatuses: (statuses: NodeStatuses) => void;
  setNodeStats: (stats: NodeStatsResponse) => void;
  getNodeStatus: (nodeId: number) => NodeStatus;
};

export const useMonitoringStore = create<MonitoringStore>((set, get) => ({
  statuses: {},
  statsByNodeId: {},
  setStatuses: (statuses) => set({ statuses }),
  setNodeStats: (stats) =>
    set((state) => ({
      statsByNodeId: {
        ...state.statsByNodeId,
        [stats.node_id]: stats,
      },
      statuses: {
        ...state.statuses,
        [stats.node_id]: stats.status,
      },
    })),
  getNodeStatus: (nodeId) => get().statuses[nodeId] ?? "offline",
}));
