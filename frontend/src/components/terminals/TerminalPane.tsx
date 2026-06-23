import { useEffect, useRef } from "react";

import { LoaderCircle, RefreshCcw, WifiOff, X } from "lucide-react";
import type { FitAddon as XtermFitAddon } from "@xterm/addon-fit";
import type { Terminal as XtermTerminal } from "@xterm/xterm";

import { getTerminalWebSocketUrl } from "../../services/api";
import { useTerminalStore, type TerminalPaneState } from "../../store/terminal";
import type { NodeSummary } from "../../types/api";

type TerminalPaneProps = {
  pane: TerminalPaneState;
  node: NodeSummary | null;
};

type TerminalSocketMessage =
  | { type: "output"; data?: string }
  | { type: "error"; message?: string }
  | { type: "exit"; data?: string }
  | { type: "pong" };

export function TerminalPane({ pane, node }: TerminalPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<XtermFitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const closePane = useTerminalStore((state) => state.closePane);
  const setPaneStatus = useTerminalStore((state) => state.setPaneStatus);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/xterm/css/xterm.css"),
        ]);

        if (!active) {
          return;
        }

        const term = new Terminal({
          cursorBlink: true,
          convertEol: true,
          fontFamily: '"SFMono-Regular", "Cascadia Code", "JetBrains Mono", Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.3,
          theme: {
            background: "#020617",
            foreground: "#dbeafe",
            cursor: "#67e8f9",
            selectionBackground: "rgba(125, 211, 252, 0.28)",
          },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(element);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        const socket = new WebSocket(getTerminalWebSocketUrl(pane.nodeId));
        socketRef.current = socket;

        socket.onopen = () => {
          setPaneStatus(pane.nodeId, "connected");
          fitAddon.fit();
          sendResize(socket, term);
        };

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data) as TerminalSocketMessage;

          if (message.type === "output" && message.data) {
            term.write(message.data);
            return;
          }

          if (message.type === "error") {
            setPaneStatus(pane.nodeId, "error", message.message ?? "Неизвестная ошибка терминала");
            term.writeln(`\r\n[ошибка] ${message.message ?? "Неизвестная ошибка терминала"}`);
            return;
          }

          if (message.type === "exit") {
            setPaneStatus(pane.nodeId, "closed");
            term.writeln(`\r\n[сеанс завершен] код выхода ${message.data ?? "0"}`);
          }
        };

        socket.onerror = () => {
          setPaneStatus(pane.nodeId, "error", "Не удалось подключиться к терминалу по веб-сокету");
          term.writeln("\r\n[ошибка] Не удалось подключиться к терминалу по веб-сокету");
        };

        socket.onclose = () => {
          setPaneStatus(pane.nodeId, "closed");
        };

        term.onData((data) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "input", data }));
          }
        });

        resizeObserverRef.current = new ResizeObserver(() => {
          fitAddon.fit();
          if (socket.readyState === WebSocket.OPEN) {
            sendResize(socket, term);
          }
        });
        resizeObserverRef.current.observe(element);
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : "Не удалось инициализировать терминал";
        setPaneStatus(pane.nodeId, "error", message);
      }
    })();

    return () => {
      active = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      const socket = socketRef.current;
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }

      socketRef.current = null;
      fitAddonRef.current = null;
      const term = terminalRef.current;
      term?.dispose();
      terminalRef.current = null;
    };
  }, [pane.nodeId, setPaneStatus]);

  function reconnect() {
    const socket = socketRef.current;
    const term = terminalRef.current;
    const fitAddon = fitAddonRef.current;

    if (socket) {
      socket.close();
    }

    if (term) {
      term.clear();
      term.writeln("[переподключение запрошено]");
    }

    if (fitAddon) {
      fitAddon.fit();
    }

    setPaneStatus(pane.nodeId, "connecting");
    closePane(pane.nodeId);
    useTerminalStore.getState().openPane({
      nodeId: pane.nodeId,
      nodeName: pane.nodeName,
    });
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/40 bg-slate-950/90 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 text-slate-100">
        <div>
          <div className="text-sm font-semibold">{pane.nodeName}</div>
          <div className="text-xs text-slate-400">
            {node ? `${node.username}@${node.host}:${node.port}` : "Сохраненная сессия"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={pane.status} />
          {(pane.status === "closed" || pane.status === "error") && (
            <button type="button" onClick={reconnect} className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800">
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => closePane(pane.nodeId)}
            className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {pane.error ? (
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{pane.error}</div>
      ) : null}

      <div ref={hostRef} className="h-[320px] w-full bg-slate-950" />
    </article>
  );
}

function sendResize(socket: WebSocket, term: XtermTerminal) {
  socket.send(
    JSON.stringify({
      type: "resize",
      cols: term.cols,
      rows: term.rows,
    }),
  );
}

function StatusBadge({ status }: { status: TerminalPaneState["status"] }) {
  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Подключение
      </span>
    );
  }

  if (status === "connected") {
    return <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">Онлайн</span>;
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-200">
        <WifiOff className="h-3.5 w-3.5" />
        Ошибка
      </span>
    );
  }

  return <span className="rounded-full bg-slate-700/70 px-3 py-1 text-xs font-medium text-slate-200">Закрыт</span>;
}
