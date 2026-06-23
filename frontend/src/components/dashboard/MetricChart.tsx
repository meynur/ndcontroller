import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { NodeMetricPoint } from "../../types/api";

type MetricChartProps = {
  title: string;
  data: NodeMetricPoint[];
  dataKey: "cpu_percent" | "ram_percent";
  stroke: string;
  gradientId: string;
};

export function MetricChart({
  title,
  data,
  dataKey,
  stroke,
  gradientId,
}: MetricChartProps) {
  return (
    <section className="rounded-[28px] border border-white/20 bg-white/10 px-4 py-4 shadow-sm backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          Последние 30 точек
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                <stop offset="55%" stopColor={stroke} stopOpacity={0.12} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={formatAxisTime}
            />
            <YAxis
              hide
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.24)", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.24)",
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(18px)",
                boxShadow: "0 18px 48px rgba(15, 23, 42, 0.12)",
              }}
              labelStyle={{ color: "#334155", fontSize: 12, marginBottom: 6 }}
              itemStyle={{ color: "#0f172a", fontSize: 12 }}
              formatter={(value: unknown) => formatMetricValue(typeof value === "number" ? value : null)}
              labelFormatter={(value: unknown) => formatTooltipTime(typeof value === "string" ? value : "")}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              connectNulls={false}
              stroke={stroke}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 0,
                fill: stroke,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatAxisTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTooltipTime(value: string): string {
  if (!value) {
    return "Нет метки времени";
  }
  const date = new Date(value);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetricValue(value: number | null): string {
  if (value == null) {
    return "Нет данных";
  }
  return `${value.toFixed(1)}%`;
}
