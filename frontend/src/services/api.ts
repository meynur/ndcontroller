import type {
  BulkJob,
  BulkJobPayload,
  ExecuteCommandPayload,
  NodeDetail,
  NodePayload,
  NodeSummary,
  NodeUpdatePayload,
  QuickCommand,
  QuickCommandPayload,
} from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? resolveDefaultApiBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Запрос завершился ошибкой (статус ${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listNodes: () => request<NodeSummary[]>("/nodes"),
  getNode: (nodeId: number) => request<NodeDetail>(`/nodes/${nodeId}`),
  createNode: (payload: NodePayload) =>
    request<NodeDetail>("/nodes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateNode: (nodeId: number, payload: NodeUpdatePayload) =>
    request<NodeDetail>(`/nodes/${nodeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteNode: (nodeId: number) =>
    request<void>(`/nodes/${nodeId}`, {
      method: "DELETE",
    }),
  executeNodeCommand: (nodeId: number, payload: ExecuteCommandPayload) =>
    request(`/nodes/${nodeId}/execute`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listQuickCommands: () => request<QuickCommand[]>("/quick-commands"),
  getQuickCommand: (commandId: number) => request<QuickCommand>(`/quick-commands/${commandId}`),
  createQuickCommand: (payload: QuickCommandPayload) =>
    request<QuickCommand>("/quick-commands", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateQuickCommand: (commandId: number, payload: Partial<QuickCommandPayload>) =>
    request<QuickCommand>(`/quick-commands/${commandId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteQuickCommand: (commandId: number) =>
    request<void>(`/quick-commands/${commandId}`, {
      method: "DELETE",
    }),
  listBulkJobs: () => request<BulkJob[]>("/bulk-jobs"),
  getBulkJob: (jobId: number) => request<BulkJob>(`/bulk-jobs/${jobId}`),
  createBulkJob: (payload: BulkJobPayload) =>
    request<BulkJob>("/bulk-jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export function getTerminalWebSocketUrl(nodeId: number): string {
  const base = import.meta.env.VITE_WS_BASE_URL ?? resolveDefaultWebSocketBaseUrl();
  return `${base}/ws/terminal/${nodeId}`;
}

function resolveDefaultApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return "/api";
  }

  return `${window.location.origin}/api`;
}

function resolveDefaultWebSocketBaseUrl(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:8000";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}
