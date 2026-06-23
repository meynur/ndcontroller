import { Pencil, SquareTerminal, Trash2 } from "lucide-react";

import type { NodeSummary } from "../../types/api";

type NodeCardProps = {
  node: NodeSummary;
  selected: boolean;
  onToggleSelect: (nodeId: number) => void;
  onOpenTerminal: (node: NodeSummary) => void;
  onEdit: (nodeId: number) => void;
  onDelete: (nodeId: number) => void;
};

export function NodeCard({
  node,
  selected,
  onToggleSelect,
  onOpenTerminal,
  onEdit,
  onDelete,
}: NodeCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border p-5 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:shadow-glow ${
        selected
          ? "border-cyan-300/70 bg-white/80 ring-2 ring-cyan-200/80"
          : "border-white/45 bg-white/55"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-cyan-200/50 via-white/20 to-transparent" />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Нода</div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{node.name}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {node.host}:{node.port}
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-2 text-xs font-medium text-slate-600">
            <input
              checked={selected}
              onChange={() => onToggleSelect(node.id)}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-300"
            />
            Выбрана
          </label>
        </div>

        <div className="rounded-2xl border border-white/50 bg-white/45 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Доступ</div>
          <div className="mt-2 text-sm text-slate-700">{node.username}@{node.host}</div>
        </div>

        <div className="min-h-20 rounded-2xl border border-white/50 bg-white/40 px-4 py-3 text-sm leading-6 text-slate-600">
          {node.note?.trim()
            ? node.note
            : "Заметка пока не добавлена. Здесь можно хранить роль сервера, подсказки по деплою и важные детали."}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpenTerminal(node)} className="glass-button flex-1">
            <SquareTerminal className="mr-2 h-4 w-4" />
            Открыть консоль
          </button>
          <button type="button" onClick={() => onEdit(node.id)} className="glass-button px-3">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDelete(node.id)} className="glass-button px-3 text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
