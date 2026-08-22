import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { ASSISTANT_SUGGESTIONS, localAnswer } from "@/lib/astrofarm/assistant";
import { askFarm } from "@/lib/astrofarm/chat.functions";
import { latestPlan } from "@/lib/astrofarm/client";
import { buildPlanDigest } from "@/lib/astrofarm/digest";
import type { ConsoleSnapshot } from "@/lib/astrofarm/types";

interface Message {
  id: string;
  role: "crew" | "agent";
  text: string;
}

/**
 * Talk-to-the-farm panel. One conversation, session only — the tablet is a
 * shared device and the agent already keeps its own log.
 */
export function HabitatChat({
  snapshot,
  className,
}: {
  snapshot: ConsoleSnapshot;
  className?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || thinking) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-c`, role: "crew", text },
    ]);
    setThinking(true);
    try {
      const answer = AGENT_ENDPOINT
        ? await askAgent(AGENT_ENDPOINT, snapshot, text)
        : await new Promise<{ text: string }>((resolve) =>
            setTimeout(() => resolve(localAnswer(snapshot, text)), 420),
          );
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "agent", text: answer.text },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: "agent",
          text: "I couldn't reach the local model just now. The numbers on this screen are still the agent's latest written state.",
        },
      ]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="live-dot" aria-hidden />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">Ask the farm</p>
          <p className="label-caps truncate">
            {AGENT_ENDPOINT ? "local model · on-device" : "local model · offline recall"}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <p className="text-base leading-relaxed text-muted-foreground">
            Ask about today's work, what's ready, what's slipping, or why the plan moved. Answers
            come from the agent's own state — no numbers are invented.
          </p>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "crew" ? "justify-end" : "justify-start")}
          >
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed",
                message.role === "crew"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {message.text}
            </p>
          </div>
        ))}

        {thinking ? (
          <p className="label-caps animate-pulse">thinking…</p>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {ASSISTANT_SUGGESTIONS.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void send(suggestion)}
              className="rounded-full border border-border-strong px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <Textarea
            ref={inputRef}
            value={input}
            rows={1}
            placeholder="Ask about the farm…"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            className="min-h-14 resize-none text-base"
          />
          <Button type="submit" size="lg" className="h-14 px-6 text-base" disabled={thinking}>
            Ask
          </Button>
        </form>
      </div>
    </section>
  );
}
