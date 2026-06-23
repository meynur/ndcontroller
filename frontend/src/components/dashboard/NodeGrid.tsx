import { Plus } from "lucide-react";

import type { NodeSummary } from "../../types/api";
import { SectionCard } from "../layout/SectionCard";
import { NodeCard } from "./NodeCard";

type NodeGridProps = {
  nodes: NodeSummary[];
  selectedNodeIds: number[];
  onCreate: () => void;
  onToggleSelect: (nodeId: number) => void;
  onOpenTerminal: (node: NodeSummary) => void;
  onEdit: (nodeId: number) => void;
  onDelete: (nodeId: number) => void;
};

export function NodeGrid({
  nodes,
  selectedNodeIds,
  onCreate,
  onToggleSelect,
  onOpenTerminal,
  onEdit,
  onDelete,
}: NodeGridProps) {
  return (
    <SectionCard
      title="Dashboard"
      description="A clean grid of saved nodes with quick selection, notes, and one-click terminal access."
      action={
        <button type="button" onClick={onCreate} className="glass-button">
          <Plus className="mr-2 h-4 w-4" />
          Add Node
        </button>
      }
    >
      {nodes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedNodeIds.includes(node.id)}
              onToggleSelect={onToggleSelect}
              onOpenTerminal={onOpenTerminal}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-dashed border-white/50 bg-white/35 px-6 py-16 text-center text-slate-600">
      <div className="text-lg font-medium text-slate-800">No nodes yet</div>
      <p className="mt-2 text-sm">Add your first Linux server to start managing commands and web terminals.</p>
    </div>
  );
}
