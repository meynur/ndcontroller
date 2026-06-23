import type { PropsWithChildren } from "react";

import { Boxes, Command, Cpu, MonitorPlay, Sparkles } from "lucide-react";

type AppShellProps = PropsWithChildren<{
  selectedCount: number;
  totalNodes: number;
  openTerminals: number;
}>;

export function AppShell({ children, selectedCount, totalNodes, openTerminals }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-6rem] h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute right-[-4rem] top-20 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="glass-panel-strong flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Личное управление нодами
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Прозрачный центр управления серверами и командами.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Управляй Linux-нодами, запускай массовые команды и держи несколько SSH-терминалов
                открытыми в одном аккуратном рабочем пространстве.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={Cpu} label="Ноды" value={totalNodes} />
            <StatCard icon={Boxes} label="Выбрано" value={selectedCount} />
            <StatCard icon={MonitorPlay} label="Терминалы" value={openTerminals} />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Command;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-white/45 bg-white/45 px-4 py-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-3 text-slate-600">
        <div className="rounded-2xl border border-white/50 bg-white/60 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
