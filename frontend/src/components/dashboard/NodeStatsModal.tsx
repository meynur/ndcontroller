import { useCallback, useEffect, useMemo, useState } from "react";

import { Activity, LoaderCircle, RefreshCcw, X } from "lucide-react";

import { usePolling } from "../../hooks/usePolling";
import { api } from "../../services/api";
import { useMonitoringStore } from "../../store/monitoring";
import type { NodeSummary } from "../../types/api";
import { MetricChart } from "./MetricChart";

type NodeStatsModalProps = {
  node: NodeSummary | null;
  open: boolean;
  onClose: () => void;
};

export function NodeStatsModal({ node, open, onClose }: NodeStatsModalProps) {
  const setNodeStats = useMonitoringStore((state) => state.setNodeStats);
  const cachedStats = useMonitoringStore((state) =>
    node ? state.statsByNodeId[node.id] : undefined,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    if (!node) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const stats = await api.getNodeStats(node.id);
      setNodeStats(stats);
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, "Не удалось загрузить статистику ноды"));
    } finally {
      setLoading(false);
    }
  }, [node, setNodeStats]);

  useEffect(() => {
    if (!open || !node) {
      return;
    }

    void refreshStats();
  }, [node, open, refreshStats]);

  usePolling(() => void refreshStats(), 20000, open && node != null);

  const latestMetric = useMemo(() => {
    if (!cachedStats?.metrics.length) {
      return null;
    }
    return cachedStats.metrics[cachedStats.metrics.length - 1] ?? null;
  }, [cachedStats]);

  if (!open || !node) {
    return null;
  }

  const status = cachedStats?.status ?? "offline";
  const cpuValue = latestMetric?.cpu_percent;
  const ramValue = latestMetric?.ram_percent;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/28 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-white/50 shadow-[0_40px_120px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="border-b border-white/20 bg-white/18 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <Activity className="h-3.5 w-3.5" />
                Статистика сервера
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{node.name}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {node.username}@{node.host}:{node.port}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusPill status={status} />
              <button
                type="button"
                onClick={() => void refreshStats()}
                className="glass-button h-10 w-10 rounded-2xl p-0"
                aria-label="Обновить статистику"
                title="Обновить статистику"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="glass-button h-10 w-10 rounded-2xl p-0"
                aria-label="Закрыть статистику"
                title="Закрыть статистику"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Текущий статус" value={status === "online" ? "Online" : "Offline"} />
            <SummaryCard label="CPU" value={cpuValue == null ? "Нет данных" : `${cpuValue.toFixed(1)}%`} />
            <SummaryCard label="RAM" value={ramValue == null ? "Нет данных" : `${ramValue.toFixed(1)}%`} />
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error ? (
            <div className="rounded-[28px] border border-rose-200/60 bg-rose-50/75 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading && !cachedStats ? (
            <div className="glass-panel flex min-h-[320px] items-center justify-center rounded-[28px]">
              <div className="inline-flex items-center gap-3 text-slate-600">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Загружаем метрики...
              </div>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <MetricChart
                title="CPU"
                data={cachedStats?.metrics ?? []}
                dataKey="cpu_percent"
                stroke="#38bdf8"
                gradientId="cpuGradient"
              />
              <MetricChart
                title="RAM"
                data={cachedStats?.metrics ?? []}
                dataKey="ram_percent"
                stroke="#14b8a6"
                gradientId="ramGradient"
              />
            </div>
          )}

          {!loading && !error && !cachedStats?.metrics.length ? (
            <div className="rounded-[28px] border border-dashed border-white/25 bg-white/12 px-5 py-10 text-center text-sm text-slate-600">
              Метрики пока не собраны. Оставь мониторинг поработать несколько циклов, и графики начнут заполняться.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/20 bg-white/14 px-4 py-4 shadow-sm backdrop-blur-lg">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "online" | "offline" }) {
  const online = status === "online";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
        online
          ? "border-emerald-200/70 bg-emerald-100/70 text-emerald-700"
          : "border-rose-200/70 bg-rose-100/70 text-rose-700"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online ? "bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.45)]" : "bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.38)]"
        }`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
