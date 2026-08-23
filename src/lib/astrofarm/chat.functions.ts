import { streamText } from "ai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { callLocalModel, localModelConfigured } from "@/lib/astrofarm/localModel";

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
 * Answer a crew question. Tries the local GB10 model first, then falls back to
 * the Lovable AI Gateway. Runs on the server so the model host's CORS preflight
 * and the API key stay out of the client bundle.
 */
export const askFarm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskSchema.parse(input))
  .handler(async ({ data }): Promise<{ text: string }> => {
    // Combine the system prompt and (optional) farm-state digest into the
    // `system` option — the AI SDK rejects role:"system" messages in `messages`.
    const system = [
      SYSTEM_PROMPT,
      ...(data.digest ? [`\n\nCurrent farm state:\n${data.digest}`] : []),
    ].join("");

    // Local GB10 model first (Hackathon backend).
    if (localModelConfigured()) {
      const text = await callLocalModel({
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.question },
        ],
        maxTokens: 800,
      });
      return { text };
    }

    // Lovable AI Gateway fallback.
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "No inference backend configured. Set MODEL_API_URL to the GB10 local model, or add LOVABLE_API_KEY for Lovable AI.",
      );
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const result = streamText({
      model: gateway("google/gemini-3.7-flash"),
      system,
      prompt: data.question,
    });

    const text = await result.text;
    if (!text.trim()) throw new Error("The model returned an empty answer.");
    return { text };
  });
