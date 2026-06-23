import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

import { NodeFormModal } from "./components/dashboard/NodeFormModal";
import { NodeGrid } from "./components/dashboard/NodeGrid";
import { AppShell } from "./components/layout/AppShell";
import { BulkResultsPanel } from "./components/quick-commands/BulkResultsPanel";
import { QuickCommandFormModal } from "./components/quick-commands/QuickCommandFormModal";
import { QuickCommandsPanel } from "./components/quick-commands/QuickCommandsPanel";
import { TerminalWorkspace } from "./components/terminals/TerminalWorkspace";
import { usePolling } from "./hooks/usePolling";
import { api } from "./services/api";
import { useMonitoringStore } from "./store/monitoring";
import { useSelectionStore } from "./store/selection";
import { useTerminalStore } from "./store/terminal";
import { useUIStore } from "./store/ui";
import type {
  BulkJob,
  BulkJobPayload,
  NodeDetail,
  NodePayload,
  NodeSummary,
  QuickCommand,
  QuickCommandPayload,
} from "./types/api";

type BannerState = {
  tone: "success" | "error";
  message: string;
} | null;

const NodeStatsModal = lazy(async () => {
  const module = await import("./components/dashboard/NodeStatsModal");
  return { default: module.NodeStatsModal };
});

export default function App() {
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const toggleNode = useSelectionStore((state) => state.toggleNode);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const nodeStatuses = useMonitoringStore((state) => state.statuses);
  const setStatuses = useMonitoringStore((state) => state.setStatuses);
  const panes = useTerminalStore((state) => state.panes);
  const openPane = useTerminalStore((state) => state.openPane);

  const nodeModalOpen = useUIStore((state) => state.nodeModalOpen);
  const nodeModalMode = useUIStore((state) => state.nodeModalMode);
  const editingNodeId = useUIStore((state) => state.editingNodeId);
  const quickCommandModalOpen = useUIStore((state) => state.quickCommandModalOpen);
  const editingQuickCommandId = useUIStore((state) => state.editingQuickCommandId);
  const openNodeCreateModal = useUIStore((state) => state.openNodeCreateModal);
  const openNodeEditModal = useUIStore((state) => state.openNodeEditModal);
  const closeNodeModal = useUIStore((state) => state.closeNodeModal);
  const openQuickCommandCreateModal = useUIStore((state) => state.openQuickCommandCreateModal);
  const openQuickCommandEditModal = useUIStore((state) => state.openQuickCommandEditModal);
  const closeQuickCommandModal = useUIStore((state) => state.closeQuickCommandModal);

  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [nodeDraft, setNodeDraft] = useState<NodeDetail | null>(null);
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);
  const [quickCommandDraft, setQuickCommandDraft] = useState<QuickCommand | null>(null);
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [statsNodeId, setStatsNodeId] = useState<number | null>(null);
  const [manualCommand, setManualCommand] = useState("");
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [savingNode, setSavingNode] = useState(false);
  const [savingQuickCommand, setSavingQuickCommand] = useState(false);
  const [runningBulkCommand, setRunningBulkCommand] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const bannerTimeoutRef = useRef<number | null>(null);

  const showBanner = useCallback((tone: "success" | "error", message: string) => {
    setBanner({ tone, message });
    if (bannerTimeoutRef.current !== null) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setBanner(null);
    }, 3500);
  }, []);

  const refreshNodes = useCallback(async () => {
    try {
      const data = await api.listNodes();
      setNodes(data);
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось загрузить список нод"));
    } finally {
      setLoadingNodes(false);
    }
  }, [showBanner]);

  const refreshQuickCommands = useCallback(async () => {
    try {
      const data = await api.listQuickCommands();
      setQuickCommands(data);
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось загрузить быстрые команды"));
    }
  }, [showBanner]);

  const refreshBulkJobs = useCallback(async () => {
    try {
      const data = await api.listBulkJobs();
      setBulkJobs(data);
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось загрузить историю задач"));
    }
  }, [showBanner]);

  const refreshNodeStatuses = useCallback(async () => {
    try {
      const data = await api.getNodeStatuses();
      setStatuses(data);
    } catch {
      // Дашборд остается рабочим даже если мониторинг временно недоступен.
    }
  }, [setStatuses]);

  useEffect(() => {
    void Promise.all([refreshNodes(), refreshQuickCommands(), refreshBulkJobs(), refreshNodeStatuses()]);
  }, [refreshBulkJobs, refreshNodeStatuses, refreshNodes, refreshQuickCommands]);

  const hasActiveJobs = bulkJobs.some((job) => job.status === "pending" || job.status === "running");
  usePolling(() => void refreshBulkJobs(), 3500, hasActiveJobs);
  usePolling(() => void refreshNodeStatuses(), 30000, true);

  useEffect(() => {
    if (!nodeModalOpen) {
      setNodeDraft(null);
      return;
    }

    if (nodeModalMode === "edit" && editingNodeId != null) {
      void api
        .getNode(editingNodeId)
        .then(setNodeDraft)
        .catch((error) => showBanner("error", resolveErrorMessage(error, "Не удалось загрузить ноду")));
    }
  }, [editingNodeId, nodeModalMode, nodeModalOpen, showBanner]);

  useEffect(() => {
    if (!quickCommandModalOpen) {
      setQuickCommandDraft(null);
      return;
    }

    if (editingQuickCommandId != null) {
      void api
        .getQuickCommand(editingQuickCommandId)
        .then(setQuickCommandDraft)
        .catch((error) => showBanner("error", resolveErrorMessage(error, "Не удалось загрузить быструю команду")));
    }
  }, [editingQuickCommandId, quickCommandModalOpen, showBanner]);

  async function handleNodeSubmit(payload: NodePayload) {
    setSavingNode(true);
    try {
      if (nodeModalMode === "create") {
        await api.createNode(payload);
        showBanner("success", "Нода сохранена");
      } else if (editingNodeId != null) {
        await api.updateNode(editingNodeId, payload);
        showBanner("success", "Нода обновлена");
      }
      closeNodeModal();
      await refreshNodes();
      await refreshNodeStatuses();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось сохранить ноду"));
    } finally {
      setSavingNode(false);
    }
  }

  async function handleQuickCommandSubmit(payload: QuickCommandPayload) {
    setSavingQuickCommand(true);
    try {
      if (editingQuickCommandId == null) {
        await api.createQuickCommand(payload);
        showBanner("success", "Быстрая команда сохранена");
      } else {
        await api.updateQuickCommand(editingQuickCommandId, payload);
        showBanner("success", "Быстрая команда обновлена");
      }
      closeQuickCommandModal();
      await refreshQuickCommands();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось сохранить быструю команду"));
    } finally {
      setSavingQuickCommand(false);
    }
  }

  async function handleDeleteNode(nodeId: number) {
    const confirmed = window.confirm("Удалить эту ноду?");
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteNode(nodeId);
      showBanner("success", "Нода удалена");
      await refreshNodes();
      await refreshNodeStatuses();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось удалить ноду"));
    }
  }

  async function handleDeleteQuickCommand(commandId: number) {
    const confirmed = window.confirm("Удалить эту быструю команду?");
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteQuickCommand(commandId);
      showBanner("success", "Быстрая команда удалена");
      await refreshQuickCommands();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось удалить быструю команду"));
    }
  }

  async function handleTogglePin(node: NodeSummary) {
    const nextPinnedState = !node.is_pinned;

    setNodes((current) =>
      current.map((item) => (item.id === node.id ? { ...item, is_pinned: nextPinnedState } : item)),
    );

    try {
      const updated = await api.updateNode(node.id, { is_pinned: nextPinnedState });
      setNodes((current) => current.map((item) => (item.id === node.id ? updated : item)));
      showBanner("success", nextPinnedState ? "Нода закреплена" : "Нода откреплена");
    } catch (error) {
      setNodes((current) =>
        current.map((item) => (item.id === node.id ? { ...item, is_pinned: node.is_pinned } : item)),
      );
      showBanner("error", resolveErrorMessage(error, "Не удалось изменить закрепление ноды"));
    }
  }

  async function runBulkJob(payload: BulkJobPayload) {
    if (selectedNodeIds.length === 0) {
      showBanner("error", "Сначала выбери хотя бы одну ноду");
      return;
    }

    setRunningBulkCommand(true);
    try {
      const createdJob = await api.createBulkJob(payload);
      setBulkJobs((current) => [createdJob, ...current]);
      showBanner("success", "Массовая задача запущена");
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Не удалось запустить массовую задачу"));
    } finally {
      setRunningBulkCommand(false);
    }
  }

  async function handleRunManual() {
    const command = manualCommand.trim();
    if (!command) {
      return;
    }

    await runBulkJob({
      title: "Ручная команда",
      node_ids: selectedNodeIds,
      command,
    });
    setManualCommand("");
  }

  async function handleRunSaved(command: QuickCommand) {
    await runBulkJob({
      title: command.name,
      node_ids: selectedNodeIds,
      quick_command_id: command.id,
    });
  }

  function handleOpenTerminal(node: NodeSummary) {
    openPane({
      nodeId: node.id,
      nodeName: node.name,
    });
  }

  function handleOpenStats(node: NodeSummary) {
    setStatsNodeId(node.id);
  }

  function handleCloseStats() {
    setStatsNodeId(null);
  }

  const sortedNodes = useMemo(
    () =>
      [...nodes].sort((left, right) => {
        if (left.is_pinned !== right.is_pinned) {
          return Number(right.is_pinned) - Number(left.is_pinned);
        }
        return right.created_at.localeCompare(left.created_at);
      }),
    [nodes],
  );

  const activeStatsNode = useMemo(
    () => sortedNodes.find((node) => node.id === statsNodeId) ?? null,
    [sortedNodes, statsNodeId],
  );

  return (
    <AppShell selectedCount={selectedNodeIds.length} totalNodes={nodes.length} openTerminals={panes.length}>
      <Banner banner={banner} />

      <div className="grid gap-6">
        {loadingNodes ? (
          <LoadingState />
        ) : (
          <NodeGrid
            nodes={sortedNodes}
            nodeStatuses={nodeStatuses}
            selectedNodeIds={selectedNodeIds}
            onCreate={openNodeCreateModal}
            onToggleSelect={toggleNode}
            onTogglePin={handleTogglePin}
            onOpenStats={handleOpenStats}
            onOpenTerminal={handleOpenTerminal}
            onEdit={openNodeEditModal}
            onDelete={handleDeleteNode}
          />
        )}

        <QuickCommandsPanel
          selectedCount={selectedNodeIds.length}
          manualCommand={manualCommand}
          onManualCommandChange={setManualCommand}
          onRunManual={handleRunManual}
          commands={quickCommands}
          loading={runningBulkCommand}
          onCreate={openQuickCommandCreateModal}
          onEdit={openQuickCommandEditModal}
          onDelete={handleDeleteQuickCommand}
          onRunSaved={handleRunSaved}
        />

        <BulkResultsPanel jobs={bulkJobs} nodes={nodes} />

        <TerminalWorkspace nodes={nodes} />
      </div>

      <div className="fixed bottom-5 right-5 z-40">
        {selectedNodeIds.length > 0 ? (
          <button type="button" onClick={clearSelection} className="glass-button">
            Снять выделение ({selectedNodeIds.length})
          </button>
        ) : null}
      </div>

      <NodeFormModal
        open={nodeModalOpen}
        mode={nodeModalMode}
        node={nodeDraft}
        loading={savingNode}
        onClose={closeNodeModal}
        onSubmit={handleNodeSubmit}
      />

      <QuickCommandFormModal
        open={quickCommandModalOpen}
        command={quickCommandDraft}
        loading={savingQuickCommand}
        onClose={closeQuickCommandModal}
        onSubmit={handleQuickCommandSubmit}
      />

      {activeStatsNode ? (
        <Suspense fallback={<StatsModalFallback onClose={handleCloseStats} />}>
          <NodeStatsModal
            open={activeStatsNode != null}
            node={activeStatsNode}
            onClose={handleCloseStats}
          />
        </Suspense>
      ) : null}
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div className="glass-panel flex min-h-[240px] items-center justify-center rounded-[32px]">
      <div className="inline-flex items-center gap-3 text-slate-600">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Загружаем дашборд...
      </div>
    </div>
  );
}

function Banner({ banner }: { banner: BannerState }) {
  if (!banner) {
    return null;
  }

  const toneClass =
    banner.tone === "success"
      ? "border-emerald-200 bg-emerald-50/85 text-emerald-700"
      : "border-rose-200 bg-rose-50/90 text-rose-700";

  return (
    <div
      className={`glass-panel fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-3 ${toneClass}`}
    >
      {banner.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span className="text-sm font-medium">{banner.message}</span>
    </div>
  );
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function StatsModalFallback({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/28 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-white/50 shadow-[0_40px_120px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="border-b border-white/20 bg-white/18 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-40 animate-pulse rounded-full bg-white/45" />
              <div className="h-8 w-72 animate-pulse rounded-full bg-white/50" />
              <div className="h-4 w-56 animate-pulse rounded-full bg-white/40" />
            </div>
            <button type="button" onClick={onClose} className="glass-button">
              Закрыть
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-white/20 bg-white/10 px-4 py-4 shadow-sm backdrop-blur-xl">
            <div className="mb-4 h-5 w-24 animate-pulse rounded-full bg-white/35" />
            <div className="h-56 animate-pulse rounded-[24px] bg-white/20" />
          </div>
          <div className="rounded-[28px] border border-white/20 bg-white/10 px-4 py-4 shadow-sm backdrop-blur-xl">
            <div className="mb-4 h-5 w-24 animate-pulse rounded-full bg-white/35" />
            <div className="h-56 animate-pulse rounded-[24px] bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
