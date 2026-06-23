import { useEffect } from "react";

export function usePolling(callback: () => void, delay: number, enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    callback();
    const id = window.setInterval(callback, delay);
    return () => window.clearInterval(id);
  }, [callback, delay, enabled]);
}
