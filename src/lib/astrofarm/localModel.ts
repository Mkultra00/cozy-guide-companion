/**
 * Server-side access to the local model on the GB10 (the Hackathon backend).
 *
 * Everything that needs inference goes through here so there is exactly one
 * place holding the endpoint, the key, and the quirks of this particular model.
 *
 * Imported only by `*.functions.ts` server functions, so it never reaches the
 * browser bundle — the API key is read from a plain (non-`VITE_`) env var.
 *
 *   MODEL_API_URL   default http://10.0.1.26:8443   (gateway; vLLM itself is :8000)
 *   MODEL_API_KEY   optional — only sent when set
 *   MODEL_NAME      default qwen27b
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LocalModelOptions {
  messages: ChatMessage[];
  /**
   * qwen27b is a *reasoning* model: it spends completion tokens thinking
   * before it fills `message.content`. Structured JSON output needs several
   * hundred tokens. Leave real headroom.
   */
  maxTokens?: number;
  temperature?: number;
  /** Ask for a JSON object back. Verified working against this server. */
  json?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "http://10.0.1.26:8443";
const DEFAULT_MODEL = "qwen27b";

export function localModelConfigured(): boolean {
  return Boolean(process.env["MODEL_API_URL"] ?? process.env["MODEL_API_KEY"]);
}

/**
 * Call the local model and return its text. Throws with a readable reason
 * rather than returning an empty string.
 */
export async function callLocalModel(options: LocalModelOptions): Promise<string> {
  const baseUrl = (process.env["MODEL_API_URL"] ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env["MODEL_API_KEY"];
  const model = process.env["MODEL_NAME"] ?? DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    signal: options.signal ?? null,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 800,
      temperature: options.temperature ?? 0.3,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
      messages: options.messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new Error("Local model rejected the API key (401).");
    }
    throw new Error(
      `Local model failed [${response.status}]${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: {
      finish_reason?: string;
      message?: { content?: string | null };
    }[];
  };

  const choice = payload.choices?.[0];
  const text = (choice?.message?.content ?? "").trim();
  if (text) return text;

  if (choice?.finish_reason === "length") {
    throw new Error(
      "The model ran out of token budget before it finished answering. Try a shorter question.",
    );
  }
  throw new Error("The model returned an empty response.");
}
