export type NodeSummary = {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  is_pinned: boolean;
  note: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
};

export type NodeDetail = NodeSummary & {
  password: string;
};

export type NodePayload = {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  is_pinned: boolean;
  note: string | null;
};

export type NodeUpdatePayload = Partial<NodePayload>;

export type NodeStatus = "online" | "offline";

export type NodeStatuses = Record<number, NodeStatus>;

export type NodeMetricPoint = {
  timestamp: string;
  cpu_percent: number | null;
  ram_percent: number | null;
};

export type NodeStatsResponse = {
  node_id: number;
  status: NodeStatus;
  metrics: NodeMetricPoint[];
};

export type QuickCommand = {
  id: number;
  name: string;
  command: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type QuickCommandPayload = {
  name: string;
  command: string;
  description: string | null;
};

export type BulkJobResult = {
  id: number;
  node_id: number;
  status: "pending" | "running" | "success" | "error";
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type BulkJob = {
  id: number;
  title: string | null;
  command: string;
  quick_command_id: number | null;
  status: "pending" | "running" | "completed" | "partial" | "failed";
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  results: BulkJobResult[];
};

export type BulkJobPayload =
  | {
      title?: string | null;
      node_ids: number[];
      command: string;
      quick_command_id?: never;
    }
  | {
      title?: string | null;
      node_ids: number[];
      command?: never;
      quick_command_id: number;
    };

export type ExecuteCommandPayload = {
  command: string;
};
