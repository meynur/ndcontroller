import { CheckCircle2, Clock3, LoaderCircle, OctagonAlert, PlayCircle } from "lucide-react";

import type { BulkJob, NodeSummary } from "../../types/api";
import { SectionCard } from "../layout/SectionCard";

type BulkResultsPanelProps = {
  jobs: BulkJob[];
  nodes: NodeSummary[];
};

const jobStatusStyles: Record<BulkJob["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  running: "bg-cyan-100 text-cyan-700",
  completed: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
};

export function BulkResultsPanel({ jobs, nodes }: BulkResultsPanelProps) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <SectionCard
      title="Bulk Activity"
      description="Track background execution for saved and ad-hoc commands, including stdout and stderr per node."
    >
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/50 bg-white/30 px-5 py-10 text-sm text-slate-600">
            No bulk jobs have been launched yet.
          </div>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="rounded-[28px] border border-white/45 bg-white/40 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{job.title || "Bulk command"}</div>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">{job.command}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${jobStatusStyles[job.status]}`}>
                  {renderStatusIcon(job.status)}
                  {job.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {job.results.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-white/50 bg-white/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {nodeMap.get(result.node_id)?.name ?? `Node #${result.node_id}`}
                        </div>
                        <div className="text-xs text-slate-500">{nodeMap.get(result.node_id)?.host ?? "Unknown host"}</div>
                      </div>
                      <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                        {result.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <OutputBlock title="stdout" value={result.stdout} tone="emerald" />
                      <OutputBlock title="stderr" value={result.stderr} tone="rose" />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function renderStatusIcon(status: BulkJob["status"]) {
  if (status === "pending") {
    return <Clock3 className="h-3.5 w-3.5" />;
  }
  if (status === "running") {
    return <LoaderCircle className="h-3.5 w-3.5 animate-spin" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  if (status === "partial") {
    return <PlayCircle className="h-3.5 w-3.5" />;
  }
  return <OctagonAlert className="h-3.5 w-3.5" />;
}

function OutputBlock({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | null;
  tone: "emerald" | "rose";
}) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${tone === "emerald" ? "border-emerald-100 bg-emerald-50/80" : "border-rose-100 bg-rose-50/80"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
        {value?.trim() ? value : "No output"}
      </pre>
    </div>
  );
}
