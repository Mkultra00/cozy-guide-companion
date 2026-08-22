import { z } from "zod";

export const DigestSchema = z.object({
  digest: z.string().min(1).max(20_000),
});

export interface Interpretation {
  headline: string;
  implications: string[];
  watchItems: string[];
  confidence: "low" | "medium" | "high";
}

export const SYSTEM_PROMPT = `You are a mission-systems analyst reading the state of an autonomous
space-agriculture planning agent. You are given a numeric digest of the current plan: crop
allocations, Equivalent System Mass (ESM) cost breakdown, budget utilisation, calorie/protein
coverage, risk index, the diff versus the previous plan, and recent constraint events.

Explain what the numbers IMPLY — do not restate them. Focus on: which constraint is really
binding and why, what the ESM composition says about the design, whether nutrition is
sustainable for the crew, what the recent events suggest about the trend, and what would
break next. Be concrete, technical and terse. No filler, no markdown.

Return ONLY JSON matching:
{"headline": string, "implications": string[3-5], "watchItems": string[2-4], "confidence": "low"|"medium"|"high"}`;

const shape = z.object({
  headline: z.string(),
  implications: z.array(z.string()),
  watchItems: z.array(z.string()).default([]),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
});

export function parseInterpretation(raw: string): Interpretation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, ""));
  } catch {
    return { headline: "Analysis", implications: [raw], watchItems: [], confidence: "low" };
  }
  return shape.parse(parsed);
}
