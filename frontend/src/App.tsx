import { useCallback, useEffect, useRef, useState } from "react";

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

import { NodeFormModal } from "./components/dashboard/NodeFormModal";
import { NodeGrid } from "./components/dashboard/NodeGrid";
import { AppShell } from "./components/layout/AppShell";
import { QuickCommandFormModal } from "./components/quick-commands/QuickCommandFormModal";
import { BulkResultsPanel } from "./components/quick-commands/BulkResultsPanel";
import { QuickCommandsPanel } from "./components/quick-commands/QuickCommandsPanel";
import { TerminalWorkspace } from "./components/terminals/TerminalWorkspace";
import { usePolling } from "./hooks/usePolling";
import { api } from "./services/api";
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

export default function App() {
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const toggleNode = useSelectionStore((state) => state.toggleNode);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
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
      showBanner("error", resolveErrorMessage(error, "Failed to load nodes"));
    } finally {
      setLoadingNodes(false);
    }
  }, [showBanner]);

  const refreshQuickCommands = useCallback(async () => {
    try {
      const data = await api.listQuickCommands();
      setQuickCommands(data);
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to load quick commands"));
    }
  }, [showBanner]);

  const refreshBulkJobs = useCallback(async () => {
    try {
      const data = await api.listBulkJobs();
      setBulkJobs(data);
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to load bulk jobs"));
    }
  }, [showBanner]);

  useEffect(() => {
    void Promise.all([refreshNodes(), refreshQuickCommands(), refreshBulkJobs()]);
  }, [refreshBulkJobs, refreshNodes, refreshQuickCommands]);

  const hasActiveJobs = bulkJobs.some((job) => job.status === "pending" || job.status === "running");
  usePolling(() => void refreshBulkJobs(), 3500, hasActiveJobs);

  useEffect(() => {
    if (!nodeModalOpen) {
      setNodeDraft(null);
      return;
    }

    if (nodeModalMode === "edit" && editingNodeId != null) {
      void api
        .getNode(editingNodeId)
        .then(setNodeDraft)
        .catch((error) => showBanner("error", resolveErrorMessage(error, "Failed to load node")));
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
        .catch((error) => showBanner("error", resolveErrorMessage(error, "Failed to load quick command")));
    }
  }, [editingQuickCommandId, quickCommandModalOpen, showBanner]);

  async function handleNodeSubmit(payload: NodePayload) {
    setSavingNode(true);
    try {
      if (nodeModalMode === "create") {
        await api.createNode(payload);
        showBanner("success", "Node saved");
      } else if (editingNodeId != null) {
        await api.updateNode(editingNodeId, payload);
        showBanner("success", "Node updated");
      }
      closeNodeModal();
      await refreshNodes();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to save node"));
    } finally {
      setSavingNode(false);
    }
  }

  async function handleQuickCommandSubmit(payload: QuickCommandPayload) {
    setSavingQuickCommand(true);
    try {
      if (editingQuickCommandId == null) {
        await api.createQuickCommand(payload);
        showBanner("success", "Quick command saved");
      } else {
        await api.updateQuickCommand(editingQuickCommandId, payload);
        showBanner("success", "Quick command updated");
      }
      closeQuickCommandModal();
      await refreshQuickCommands();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to save quick command"));
    } finally {
      setSavingQuickCommand(false);
    }
  }

  async function handleDeleteNode(nodeId: number) {
    const confirmed = window.confirm("Delete this node?");
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteNode(nodeId);
      showBanner("success", "Node deleted");
      await refreshNodes();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to delete node"));
    }
  }

  async function handleDeleteQuickCommand(commandId: number) {
    const confirmed = window.confirm("Delete this quick command?");
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteQuickCommand(commandId);
      showBanner("success", "Quick command deleted");
      await refreshQuickCommands();
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to delete quick command"));
    }
  }

  async function runBulkJob(payload: BulkJobPayload) {
    if (selectedNodeIds.length === 0) {
      showBanner("error", "Select at least one node first");
      return;
    }

    setRunningBulkCommand(true);
    try {
      const createdJob = await api.createBulkJob(payload);
      setBulkJobs((current) => [createdJob, ...current]);
      showBanner("success", "Bulk job started");
    } catch (error) {
      showBanner("error", resolveErrorMessage(error, "Failed to run bulk job"));
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
      title: "Manual command",
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

  return (
    <AppShell selectedCount={selectedNodeIds.length} totalNodes={nodes.length} openTerminals={panes.length}>
      <Banner banner={banner} />

      <div className="grid gap-6">
        {loadingNodes ? (
          <LoadingState />
        ) : (
          <NodeGrid
            nodes={nodes}
            selectedNodeIds={selectedNodeIds}
            onCreate={openNodeCreateModal}
            onToggleSelect={toggleNode}
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
            Clear Selection ({selectedNodeIds.length})
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
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div className="glass-panel flex min-h-[240px] items-center justify-center rounded-[32px]">
      <div className="inline-flex items-center gap-3 text-slate-600">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading dashboard...
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
    <div className={`glass-panel fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-3 ${toneClass}`}>
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
