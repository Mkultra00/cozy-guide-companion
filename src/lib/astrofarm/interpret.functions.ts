import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { callLocalModel, localModelConfigured } from "@/lib/astrofarm/localModel";

const DigestSchema = z.object({
  digest: z.string().min(1).max(20_000),
});

export interface Interpretation {
  headline: string;
  implications: string[];
  watchItems: string[];
  confidence: "low" | "medium" | "high";
}

const SYSTEM_PROMPT = `You are a mission-systems analyst reading the state of an autonomous
space-agriculture planning agent. You are given a numeric digest of the current plan: crop
allocations, Equivalent System Mass (ESM) cost breakdown, budget utilisation, calorie/protein
coverage, risk index, the diff versus the previous plan, and recent constraint events.

Explain what the numbers IMPLY — do not restate them. Focus on: which constraint is really
binding and why, what the ESM composition says about the design, whether nutrition is
sustainable for the crew, what the recent events suggest about the trend, and what would
break next. Be concrete, technical and terse. No filler, no markdown.

Return ONLY JSON matching:
{"headline": string, "implications": string[3-5], "watchItems": string[2-4], "confidence": "low"|"medium"|"high"}`;

export const interpretSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DigestSchema.parse(input))
  .handler(async ({ data }): Promise<Interpretation> => {
    // Local GB10 model first (Hackathon backend); cloud gateway only as fallback.
    if (localModelConfigured()) {
      const local = await callLocalModel({
        json: true,
        maxTokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.digest },
        ],
      });
      return parseInterpretation(local);
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.digest },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`AI gateway failed [${response.status}]: ${body}`);
      if (response.status === 429) {
        throw new Error("Analysis rate limited — wait a moment and run it again.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted for this workspace. Add credits to continue.");
      }
      throw new Error(`Analysis failed [${response.status}]: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) throw new Error("The model returned an empty analysis.");
    return parseInterpretation(raw);
  });

function parseInterpretation(raw: string): Interpretation {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, ""));
    } catch {
      return {
        headline: "Analysis",
        implications: [raw],
        watchItems: [],
        confidence: "low",
      };
    }

    const shape = z.object({
      headline: z.string(),
      implications: z.array(z.string()),
      watchItems: z.array(z.string()).default([]),
      confidence: z.enum(["low", "medium", "high"]).default("medium"),
    });
  return shape.parse(parsed);
}
