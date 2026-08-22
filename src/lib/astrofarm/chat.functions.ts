import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { callLocalModel } from "@/lib/astrofarm/localModel";

const AskSchema = z.object({
  question: z.string().min(1).max(4_000),
  /** Numeric digest of current agent state, so answers cite real values. */
  digest: z.string().max(20_000).optional(),
});

const SYSTEM_PROMPT = `You are the farm assistant aboard a bioregenerative life-support habitat,
speaking directly to the crew member who tends it.

You may be given a digest of the farm's current state: plan allocations, budgets, tray
schedule, and recent events. When the question is about the farm, answer from that digest
and never invent a number, a tray, or a crop that is not in it. You know the plan and the
schedule — you do not observe the plants, so do not claim to.

If the question is not about the farm, just answer it normally and briefly.

Plain spoken prose. No markdown, no headings, no bullet points.`;

/**
 * Answer a crew question using the local model on the GB10.
 *
 * Runs on the server: a direct browser fetch to the model host is blocked by
 * its CORS preflight, and this keeps the API key out of the client bundle.
 */
export const askFarm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskSchema.parse(input))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(data.digest
        ? [{ role: "system" as const, content: `Current farm state:\n${data.digest}` }]
        : []),
      { role: "user" as const, content: data.question },
    ];

    const text = await callLocalModel({ messages, maxTokens: 800 });
    return { text };
  });
