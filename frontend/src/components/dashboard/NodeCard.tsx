import { Activity, Circle, Pencil, Pin, SquareTerminal, Trash2 } from "lucide-react";

import type { NodeStatus, NodeSummary } from "../../types/api";

type NodeCardProps = {
  node: NodeSummary;
  status: NodeStatus;
  selected: boolean;
  onToggleSelect: (nodeId: number) => void;
  onTogglePin: (node: NodeSummary) => void;
  onOpenStats: (node: NodeSummary) => void;
  onOpenTerminal: (node: NodeSummary) => void;
  onEdit: (nodeId: number) => void;
  onDelete: (nodeId: number) => void;
};

export function NodeCard({
  node,
  status,
  selected,
  onToggleSelect,
  onTogglePin,
  onOpenStats,
  onOpenTerminal,
  onEdit,
  onDelete,
}: NodeCardProps) {
  const online = status === "online";

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border p-5 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:shadow-glow ${
        selected
          ? "border-cyan-300/70 bg-white/80 ring-2 ring-cyan-200/80"
          : online
            ? "border-emerald-200/70 bg-white/55"
            : "border-rose-200/70 bg-white/55"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br via-white/20 to-transparent ${
          online ? "from-emerald-200/45" : "from-rose-200/45"
        }`}
      />

      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
              <span>Нода</span>
              {node.is_pinned ? (
                <span className="rounded-full border border-amber-200/70 bg-amber-100/70 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-amber-700">
                  PIN
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{node.name}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {node.host}:{node.port}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => onTogglePin(node)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                node.is_pinned
                  ? "border-amber-200/70 bg-amber-100/80 text-amber-700"
                  : "border-white/60 bg-white/60 text-slate-500 hover:text-slate-700"
              }`}
              aria-label={node.is_pinned ? "Открепить ноду" : "Закрепить ноду"}
              title={node.is_pinned ? "Открепить ноду" : "Закрепить ноду"}
            >
              <Pin className={`h-4 w-4 ${node.is_pinned ? "fill-current" : ""}`} />
            </button>

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
        </div>

        <div className="rounded-2xl border border-white/50 bg-white/45 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Доступ</div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                online
                  ? "border-emerald-200/70 bg-emerald-100/70 text-emerald-700"
                  : "border-rose-200/70 bg-rose-100/70 text-rose-700"
              }`}
            >
              <Circle
                className={`h-2.5 w-2.5 ${
                  online ? "fill-emerald-500 text-emerald-500" : "fill-rose-500 text-rose-500"
                }`}
              />
              {online ? "Online" : "Offline"}
            </span>
          </div>
          <div className="mt-2 text-sm text-slate-700">
            {node.username}@{node.host}
          </div>
        </div>

        <div className="min-h-20 rounded-2xl border border-white/50 bg-white/40 px-4 py-3 text-sm leading-6 text-slate-600">
          {node.note?.trim()
            ? node.note
            : "Заметка пока не добавлена. Здесь можно хранить роль сервера, подсказки по деплою и важные детали."}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpenStats(node)} className="glass-button">
            <Activity className="mr-2 h-4 w-4" />
            Статистика
          </button>
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
