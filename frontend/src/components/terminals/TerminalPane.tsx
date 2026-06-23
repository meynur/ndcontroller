import { useCallback, useEffect, useRef, useState } from "react";

import {
  Copy,
  ExternalLink,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RefreshCcw,
  WifiOff,
  X,
} from "lucide-react";
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

type ContextMenuState = {
  x: number;
  y: number;
} | null;

export function TerminalPane({ pane, node }: TerminalPaneProps) {
  const paneRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<XtermFitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const closePane = useTerminalStore((state) => state.closePane);
  const setPaneStatus = useTerminalStore((state) => state.setPaneStatus);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const sendInput = useCallback((data: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: "input", data }));
  }, []);

  const fitTerminal = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    const term = terminalRef.current;
    const socket = socketRef.current;

    if (!fitAddon || !term) {
      return;
    }

    fitAddon.fit();
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendResize(socket, term);
    }
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        showToast("Буфер обмена пуст");
        return;
      }
      sendInput(text);
      showToast("Текст вставлен");
    } catch {
      showToast("Не удалось прочитать буфер обмена");
    } finally {
      setContextMenu(null);
    }
  }, [sendInput, showToast]);

  const copySshCommand = useCallback(async () => {
    if (!node) {
      showToast("Нода недоступна");
      return;
    }

    const command = `ssh ${node.username}@${node.host} -p ${node.port}`;
    try {
      await navigator.clipboard.writeText(command);
      showToast("Команда скопирована");
    } catch {
      showToast("Не удалось скопировать команду");
    }
  }, [node, showToast]);

  const toggleFullscreen = useCallback(async () => {
    const element = paneRef.current;
    if (!element) {
      return;
    }

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      showToast("Не удалось переключить полноэкранный режим");
    }
  }, [showToast]);

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
            const errorMessage = message.message ?? "Неизвестная ошибка терминала";
            setPaneStatus(pane.nodeId, "error", errorMessage);
            term.writeln(`\r\n[ошибка] ${errorMessage}`);
            return;
          }

          if (message.type === "exit") {
            setPaneStatus(pane.nodeId, "closed");
            term.writeln(`\r\n[сеанс завершен] код выхода ${message.data ?? "0"}`);
          }
        };

        socket.onerror = () => {
          const errorMessage = "Не удалось подключиться к терминалу по веб-сокету";
          setPaneStatus(pane.nodeId, "error", errorMessage);
          term.writeln(`\r\n[ошибка] ${errorMessage}`);
        };

        socket.onclose = () => {
          setPaneStatus(pane.nodeId, "closed");
        };

        term.onData((data) => {
          sendInput(data);
        });

        const handlePaste = (event: ClipboardEvent) => {
          if (!event.clipboardData) {
            return;
          }
          event.preventDefault();
          const text = event.clipboardData.getData("text");
          if (text) {
            sendInput(text);
            showToast("Текст вставлен");
          }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
            event.preventDefault();
            void pasteFromClipboard();
          }
          if (event.key === "Escape") {
            setContextMenu(null);
          }
        };

        const handleContextMenu = (event: MouseEvent) => {
          event.preventDefault();
          const paneBounds = paneRef.current?.getBoundingClientRect();
          if (!paneBounds) {
            return;
          }
          setContextMenu({
            x: event.clientX - paneBounds.left,
            y: event.clientY - paneBounds.top,
          });
        };

        element.addEventListener("paste", handlePaste);
        element.addEventListener("keydown", handleKeyDown);
        element.addEventListener("contextmenu", handleContextMenu);

        resizeObserverRef.current = new ResizeObserver(() => {
          fitAddon.fit();
          if (socket.readyState === WebSocket.OPEN) {
            sendResize(socket, term);
          }
        });
        resizeObserverRef.current.observe(element);

        const cleanupListeners = () => {
          element.removeEventListener("paste", handlePaste);
          element.removeEventListener("keydown", handleKeyDown);
          element.removeEventListener("contextmenu", handleContextMenu);
        };

        (term as XtermTerminal & { __cleanupListeners__?: () => void }).__cleanupListeners__ = cleanupListeners;
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

      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      const socket = socketRef.current;
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }

      socketRef.current = null;
      fitAddonRef.current = null;

      const term = terminalRef.current as (XtermTerminal & { __cleanupListeners__?: () => void }) | null;
      term?.__cleanupListeners__?.();
      term?.dispose();
      terminalRef.current = null;
    };
  }, [pane.nodeId, pasteFromClipboard, sendInput, setPaneStatus, showToast]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const current = paneRef.current;
      setIsFullscreen(document.fullscreenElement === current);
      window.setTimeout(() => {
        fitTerminal();
      }, 30);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [fitTerminal]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeMenu = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("scroll", closeMenu, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("scroll", closeMenu, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  function reconnect() {
    const socket = socketRef.current;
    const term = terminalRef.current;
    const fitAddon = fitAddonRef.current;

    if (socket) {
      socket.close();
    }

    if (term) {
      term.clear();
      term.writeln("[запрошено переподключение]");
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

  const sshHref = node ? `ssh://${node.username}@${node.host}:${node.port}` : null;

  return (
    <article
      ref={paneRef}
      className="relative overflow-hidden rounded-[28px] border border-white/40 bg-slate-950/90 shadow-glow"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 text-slate-100">
        <div>
          <div className="text-sm font-semibold">{pane.nodeName}</div>
          <div className="text-xs text-slate-400">
            {node ? `${node.username}@${node.host}:${node.port}` : "Сохраненная сессия"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={pane.status} />
          {sshHref ? (
            <a
              href={sshHref}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
              title="Открыть в терминале ОС"
              aria-label="Открыть в терминале ОС"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {node ? (
            <button
              type="button"
              onClick={() => void copySshCommand()}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
              title="Скопировать SSH-команду"
              aria-label="Скопировать SSH-команду"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
            title={isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
            aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          {(pane.status === "closed" || pane.status === "error") && (
            <button
              type="button"
              onClick={reconnect}
              className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
              title="Переподключить"
              aria-label="Переподключить"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => closePane(pane.nodeId)}
            className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
            title="Закрыть терминал"
            aria-label="Закрыть терминал"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {pane.error ? (
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{pane.error}</div>
      ) : null}

      <div ref={hostRef} className="h-[320px] w-full bg-slate-950 outline-none" tabIndex={0} />

      {contextMenu ? (
        <div
          className="absolute z-20 min-w-44 rounded-[22px] border border-white/15 bg-white/12 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.38)] backdrop-blur-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => void pasteFromClipboard()}
            className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/12"
          >
            <Copy className="h-4 w-4" />
            Вставить
          </button>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/15 bg-white/12 px-4 py-2 text-xs font-medium text-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          {toastMessage}
        </div>
      ) : null}
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
