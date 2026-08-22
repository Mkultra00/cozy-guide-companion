import { useEffect, useState } from "react";

/**
 * Stable "now" for relative timestamps: fixed during SSR/hydration, then
 * ticking on the client so the action feed ages in real time.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.parse("2026-08-22T15:41:00Z"));

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
