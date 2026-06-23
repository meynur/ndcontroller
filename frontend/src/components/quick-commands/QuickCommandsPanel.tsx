import { LoaderCircle, Pencil, Play, Plus, Trash2, WandSparkles } from "lucide-react";

import type { QuickCommand } from "../../types/api";
import { SectionCard } from "../layout/SectionCard";

type QuickCommandsPanelProps = {
  selectedCount: number;
  manualCommand: string;
  onManualCommandChange: (value: string) => void;
  onRunManual: () => Promise<void>;
  commands: QuickCommand[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (commandId: number) => void;
  onDelete: (commandId: number) => void;
  onRunSaved: (command: QuickCommand) => Promise<void>;
};

export function QuickCommandsPanel({
  selectedCount,
  manualCommand,
  onManualCommandChange,
  onRunManual,
  commands,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onRunSaved,
}: QuickCommandsPanelProps) {
  return (
    <SectionCard
      title="Быстрые команды"
      description="Сохраняй bash-команды один раз и запускай их по выбранным нодам в фоне."
      action={
        <button type="button" onClick={onCreate} className="glass-button">
          <Plus className="mr-2 h-4 w-4" />
          Добавить команду
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/45 bg-white/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-800">Ручной запуск</div>
              <p className="mt-1 text-sm text-slate-600">
                Отправь произвольную команду на {selectedNodeLabel(selectedCount)}.
              </p>
            </div>
            <span className="rounded-full border border-white/50 bg-white/60 px-3 py-1 text-xs font-medium text-slate-600">
              Выбрано: {selectedCount}
            </span>
          </div>

          <textarea
            value={manualCommand}
            onChange={(event) => onManualCommandChange(event.target.value)}
            className="glass-input mt-4 min-h-32 resize-y font-mono text-xs"
            placeholder="systemctl restart nginx"
          />

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void onRunManual()}
              disabled={loading || selectedCount === 0 || !manualCommand.trim()}
              className="glass-button bg-cyan-500/90 text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              Запустить на выбранных
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {commands.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-white/50 bg-white/30 px-5 py-10 text-sm text-slate-600">
              Сохраненных быстрых команд пока нет.
            </div>
          ) : (
            commands.map((command) => (
              <article key={command.id} className="rounded-[26px] border border-white/45 bg-white/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{command.name}</h3>
                    {command.description ? (
                      <p className="mt-1 text-sm text-slate-600">{command.description}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(command.id)} className="glass-button px-3">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onDelete(command.id)} className="glass-button px-3 text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/50 bg-slate-950/80 px-4 py-4 text-xs text-cyan-100">
                  <code>{command.command}</code>
                </pre>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void onRunSaved(command)}
                    disabled={loading || selectedCount === 0}
                    className="glass-button bg-white/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Запустить команду
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function selectedNodeLabel(count: number) {
  if (count === 1) {
    return "1 выбранную ноду";
  }
  if (count >= 2 && count <= 4) {
    return `${count} выбранные ноды`;
  }
  return `${count} выбранных нод`;
}
