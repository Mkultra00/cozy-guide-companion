import { queryOptions } from "@tanstack/react-query";
import { FIXTURE_SNAPSHOT } from "./fixtures";
import type { ConsoleSnapshot } from "./types";

/**
 * Read-only data access for the console.
 *
 * The console never writes. It reads one snapshot document that the local agent
 * worker exposes over HTTP on the GB10 (a thin read API in front of the
 * astrofarm Mongo database). Point it at the real agent by setting
 * VITE_ASTROFARM_API, e.g. VITE_ASTROFARM_API=http://localhost:8787
 * Expected endpoint: GET {base}/snapshot -> ConsoleSnapshot
 *
 * With no endpoint configured, the reference fixture snapshot is served so the
 * UI is fully legible offline.
 */

export const AGENT_ENDPOINT: string | null =
  (import.meta.env["VITE_ASTROFARM_API"] as string | undefined)?.replace(/\/$/, "") ?? null;

export async function fetchSnapshot(): Promise<ConsoleSnapshot> {
  if (!AGENT_ENDPOINT) return FIXTURE_SNAPSHOT;

  const response = await fetch(`${AGENT_ENDPOINT}/snapshot`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Agent read API returned ${response.status}`);
  }
  const snapshot = (await response.json()) as ConsoleSnapshot;
  return {
    ...snapshot,
    status: { ...snapshot.status, source: "live", endpoint: AGENT_ENDPOINT },
  };
}

export const snapshotQuery = queryOptions({
  queryKey: ["astrofarm", "snapshot"],
  queryFn: fetchSnapshot,
  // The agent heartbeats every 5 minutes; poll faster so the feed looks alive.
  refetchInterval: AGENT_ENDPOINT ? 5_000 : false,
  staleTime: AGENT_ENDPOINT ? 0 : Infinity,
});

export function latestPlan(snapshot: ConsoleSnapshot) {
  return [...snapshot.plans].sort((a, b) => b.version - a.version)[0] ?? null;
}

export function planByVersion(snapshot: ConsoleSnapshot, version: number) {
  return snapshot.plans.find((plan) => plan.version === version) ?? null;
}
