import { LayoutGrid, MonitorX } from "lucide-react";

import type { NodeSummary } from "../../types/api";
import { useTerminalStore } from "../../store/terminal";
import { SectionCard } from "../layout/SectionCard";
import { TerminalPane } from "./TerminalPane";

type TerminalWorkspaceProps = {
  nodes: NodeSummary[];
};

export function TerminalWorkspace({ nodes }: TerminalWorkspaceProps) {
  const panes = useTerminalStore((state) => state.panes);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <SectionCard
      title="Terminal Workspace"
      description="Open up to four side-by-side browser terminals and monitor several machines at once."
      action={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-2 text-xs font-medium text-slate-600">
          <LayoutGrid className="h-4 w-4" />
          {panes.length}/4 panes
        </div>
      }
      className="min-h-[420px]"
    >
      {panes.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[30px] border border-dashed border-white/50 bg-white/30 text-center text-slate-600">
          <MonitorX className="h-10 w-10 text-slate-400" />
          <div className="mt-4 text-lg font-medium text-slate-800">No terminals open</div>
          <p className="mt-2 max-w-lg text-sm">
            Use the “Open Console” action on any node card to launch a live WebSSH session here.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${getGridClass(panes.length)}`}>
          {panes.map((pane) => (
            <TerminalPane key={pane.nodeId} pane={pane} node={nodeMap.get(pane.nodeId) ?? null} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function getGridClass(count: number): string {
  if (count === 1) {
    return "grid-cols-1";
  }
  if (count === 2) {
    return "grid-cols-1 xl:grid-cols-2";
  }
  return "grid-cols-1 xl:grid-cols-2";
}
