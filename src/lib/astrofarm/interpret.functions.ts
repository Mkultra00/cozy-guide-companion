import { createServerFn } from "@tanstack/react-start";

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
    if (!apiKey) {
      throw new Error(
        "No inference backend configured. Set MODEL_API_URL to the GB10 local model.",
      );
    }

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
