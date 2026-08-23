import { streamText } from "ai";
import { createServerFn } from "@tanstack/react-start";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  DigestSchema,
  SYSTEM_PROMPT,
  parseInterpretation,
  type Interpretation,
} from "@/lib/astrofarm/interpret.core";
import { callLocalModel, localModelConfigured } from "@/lib/astrofarm/localModel";

export type { Interpretation };

export const interpretSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DigestSchema.parse(input))
  .handler(async ({ data }): Promise<Interpretation> => {
    // Local GB10 model first (Hackathon backend); Lovable AI Gateway only as fallback.
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
    if (!apiKey) {
      throw new Error(
        "No inference backend configured. Set MODEL_API_URL to the GB10 local model, or add LOVABLE_API_KEY for Lovable AI.",
      );
    }

    // Stream the gateway call (reasoning-capable Gemini can run long) and consume
    // server-side — a buffered call would be severed by the host after ~2 minutes.
    const gateway = createLovableAiGatewayProvider(apiKey);
    const result = streamText({
      model: gateway("google/gemini-3.7-flash"),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: data.digest },
      ],
    });

    let raw: string;
    try {
      raw = await result.text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/402|credits/i.test(message)) {
        throw new Error("AI credits exhausted for this workspace. Add credits to continue.");
      }
      if (/429|rate limit/i.test(message)) {
        throw new Error("Analysis rate limited — wait a moment and run it again.");
      }
      throw new Error(`Analysis failed: ${message}`);
    }

    if (!raw.trim()) throw new Error("The model returned an empty analysis.");
    return parseInterpretation(raw);
  });
