import type { ConsoleSnapshot } from "./types";
import { latestPlan } from "./client";

/**
 * Offline stand-in for the local model's Q&A endpoint.
 *
 * When the agent is connected the tablet POSTs the question to
 * {base}/ask and renders the model's prose. With no endpoint configured we
 * answer from the snapshot itself so the tablet is still legible and every
 * number on screen is traceable to state the agent wrote. Nothing here is
 * invented: each branch only reads fields present in the snapshot.
 */

export interface AssistantAnswer {
  text: string;
  grounded: string[];
}

const SUGGESTIONS = [
  "What should I do first today?",
  "What can I pick right now?",
  "What isn't going well?",
  "Are we covering the crew's calories?",
  "Why did the plan change?",
] as const;

export const ASSISTANT_SUGGESTIONS: readonly string[] = SUGGESTIONS;

function list(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function localAnswer(snapshot: ConsoleSnapshot, question: string): AssistantAnswer {
  const q = question.toLowerCase();
  const briefing = snapshot.crewBriefing;
  const facts = briefing?.facts ?? null;
  const plan = latestPlan(snapshot);

  const trays = [...snapshot.trays].sort((a, b) => a.daysRemaining - b.daysRemaining);
  const active = trays.filter((t) => t.status !== "harvested");
  const ready = trays.filter((t) => t.status === "overdue" || t.status === "ready");
  const dueSoon = trays.filter((t) => t.status === "due_soon");
  const proposals = trays.filter((t) => t.replantProposal);

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  // What can I pick / harvest
  if (has("pick", "harvest", "ready", "eat", "food")) {
    if (ready.length === 0) {
      const next = active[0];
      return {
        text: next
          ? `Nothing is ready to pick right now. The next one up is ${next.trayId} ${next.cropName}, ${next.daysRemaining} days out at about ${next.expectedKg.toFixed(1)} kg.`
          : "Nothing is ready to pick, and there are no active trays on the schedule.",
        grounded: ["trays"],
      };
    }
    return {
      text: `You can pick ${list(
        ready.map(
          (t) =>
            `${t.trayId} ${t.cropName} (${t.expectedKg.toFixed(1)} kg${
              t.daysRemaining < 0 ? `, ${Math.abs(t.daysRemaining)} days late` : ""
            })`,
        ),
      )}. Start with the overdue ones — the cycle length is already spent on them.`,
      grounded: ["trays"],
    };
  }

  // What is going wrong / what should I worry about
  if (has("wrong", "worry", "bad", "isn't going well", "not going well", "risk", "problem", "issue")) {
    const late = trays.filter((t) => t.status === "overdue");
    const parts: string[] = [];
    if (late.length > 0) {
      parts.push(
        `${list(
          late.map((t) => `${t.trayId} ${t.cropName} is ${Math.abs(t.daysRemaining)} days past its cycle`),
        )}`,
      );
    }
    if (facts?.highestRiskTray) {
      parts.push(
        `${facts.highestRiskTray.tray} ${facts.highestRiskTray.crop} carries the highest composite risk in the mix at ${facts.highestRiskTray.risk.toFixed(2)}`,
      );
    }
    if (plan) {
      parts.push(`the ${plan.diffFromPrevious?.bindingConstraint ?? "area"} budget is the binding constraint on plan v${plan.version}`);
    }
    return {
      text:
        parts.length === 0
          ? "Nothing is off schedule and no tray is flagged. Everything on the board is inside its cycle."
          : `${parts.join("; ")}. Everything else is inside its cycle.`,
      grounded: ["trays", "plans"],
    };
  }

  // Calories / nutrition
  if (has("calorie", "kcal", "nutrition", "protein", "feed")) {
    const pct = facts?.kcalCoveragePct ?? (plan ? Math.round(plan.summary.kcalCoverage * 100) : null);
    return {
      text: plan
        ? `The current plan covers ${pct ?? "—"}% of crew calories — about ${Math.round(plan.summary.kcalPerDay)} kcal and ${Math.round(plan.summary.proteinGPerDay)} g of protein a day. The rest still comes out of stowed rations.`
        : "There is no plan on file yet, so I can't give you a coverage number.",
      grounded: ["plans"],
    };
  }

  // Plan change / why
  if (has("plan", "change", "why", "replan", "constraint", "budget")) {
    if (!plan) return { text: "The agent has not written a plan yet.", grounded: [] };
    return {
      text: `We're on plan v${plan.version}, triggered by ${plan.triggeredBy}. ${plan.rationale}`,
      grounded: ["plans"],
    };
  }

  // Replant proposals
  if (has("replant", "plant", "propose", "proposal", "seed")) {
    if (proposals.length === 0) {
      return { text: "There's no replant waiting on your answer right now.", grounded: ["trays"] };
    }
    const t = proposals[0]!;
    const p = t.replantProposal!;
    return {
      text: `${t.trayId} is the one waiting on you. I'd put ${p.cropName} in it — ${p.areaM2.toFixed(1)} m², ${p.cycleDays}-day cycle. ${p.reason}`,
      grounded: ["trays"],
    };
  }

  // Schedule / what's coming
  if (has("schedule", "coming", "next", "week", "due", "when")) {
    return {
      text:
        dueSoon.length > 0
          ? `Coming due: ${list(dueSoon.map((t) => `${t.trayId} ${t.cropName} in ${t.daysRemaining} days`))}. After that the next is ${active.filter((t) => t.status === "growing")[0]?.cropName ?? "nothing on the board"}.`
          : `Nothing is due in the next three days. ${active.length} trays are still growing.`,
      grounded: ["trays"],
    };
  }

  // Workload
  if (has("time", "minute", "long", "workload", "busy")) {
    return {
      text: `You're looking at about ${facts?.crewMinutesToday ?? active.reduce((s, t) => s + t.crewMinToday, 0)} minutes of tending today across ${facts?.traysActive ?? active.length} active trays.`,
      grounded: ["trays"],
    };
  }

  // Default: today's focus / summary
  const first = ready[0] ?? active[0] ?? null;
  return {
    text: briefing
      ? briefing.text
      : first
        ? `Start with ${first.trayId} ${first.cropName}. ${active.length} trays are active.`
        : "There are no trays on the board yet.",
    grounded: ["agentLog", "trays"],
  };
}

export async function askAgent(
  endpoint: string,
  snapshot: ConsoleSnapshot,
  question: string,
): Promise<AssistantAnswer> {
  const response = await fetch(`${endpoint}/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`Agent returned ${response.status}`);
  const data = (await response.json()) as { text?: string; grounded?: string[] };
  if (!data.text) return localAnswer(snapshot, question);
  return { text: data.text, grounded: data.grounded ?? [] };
}
