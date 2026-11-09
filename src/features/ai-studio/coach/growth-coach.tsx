"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Eraser, SendHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { GenerationError } from "@/components/content/generation-states";
import { apiFetch, toastError, type AIResult } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { CreditNote } from "../shared";

interface CoachOutput {
  reply: string;
  suggestedActions: string[];
  followUpQuestions: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  followUps?: string[];
}

const STORAGE_KEY = "sb:coach-conversation";
const MAX_HISTORY = 12;
const STARTERS = [
  "What should I focus on this week to grow?",
  "How often should I post on my main platform?",
  "My engagement dropped — what could I try?",
  "Give me a content mix for the next 2 weeks.",
];

export function GrowthCoach({ aiReady }: { aiReady: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      // Restoring from browser storage (an external system) once on mount; it
      // can't be read during render without a server/client hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setMessages(JSON.parse(raw) as Message[]);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setError(null);
    const history = messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setDraft("");
    setLoading(true);
    const res = await apiFetch<AIResult<CoachOutput>>("/api/ai/growth_coach", { method: "POST", json: { input: { message, history } } });
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      toastError(res.error);
      // Put the message back so the user can retry.
      setMessages((m) => m.slice(0, -1));
      setDraft(message);
      return;
    }
    const o = res.data.output;
    setMessages((m) => [...m, { role: "assistant", content: o.reply, actions: o.suggestedActions, followUps: o.followUpQuestions }]);
  }

  const last = messages[messages.length - 1];

  return (
    <Card className="flex h-[calc(100vh-14rem)] min-h-[520px] flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="text-primary size-5" /> Your growth coach
        </CardTitle>
        {messages.length > 0 && (
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="ghost">
                <Eraser className="size-4" /> New chat
              </Button>
            }
            title="Start a new conversation?"
            description="The current conversation will be cleared from this browser."
            confirmLabel="Clear"
            onConfirm={() => setMessages([])}
          />
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto py-4" aria-live="polite" role="log">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md space-y-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Ask anything about growing your audience. The coach uses your brand profile and any real performance data you&apos;ve connected or entered.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => send(s)} disabled={!aiReady || loading} className="h-auto py-1.5 whitespace-normal">
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                m.role === "user" ? "bg-muted" : "bg-primary/10 text-primary",
              )}
              aria-hidden
            >
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "text-right")}>
              <div
                className={cn(
                  "inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <span className="sr-only">{m.role === "user" ? "You said: " : "Coach said: "}</span>
                {m.content}
              </div>
              {m.role === "assistant" && m.actions && m.actions.length > 0 && (
                <div className="rounded-lg border p-3 text-left">
                  <p className="mb-1.5 text-xs font-medium">Suggested actions</p>
                  <ul className="space-y-1">
                    {m.actions.map((a) => (
                      <li key={a} className="flex gap-2 text-sm">
                        <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {m.role === "assistant" && <CopyButton size="sm" variant="ghost" text={m.content} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3" role="status">
            <span className="bg-primary/10 text-primary inline-flex size-8 items-center justify-center rounded-full">
              <Bot className="size-4" />
            </span>
            <div className="bg-muted flex items-center gap-1 rounded-2xl px-4 py-3">
              <span className="bg-foreground/40 size-1.5 animate-bounce rounded-full" />
              <span className="bg-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
              <span className="sr-only">Coach is thinking</span>
            </div>
          </div>
        )}
        {error && <GenerationError message={error} />}
        <div ref={endRef} />
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t pt-4">
        {last?.role === "assistant" && last.followUps && last.followUps.length > 0 && !loading && (
          <div className="flex flex-wrap gap-1.5">
            {last.followUps.map((q) => (
              <Button key={q} size="sm" variant="secondary" className="h-auto py-1 text-xs whitespace-normal" onClick={() => send(q)} disabled={!aiReady}>
                {q}
              </Button>
            ))}
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder={aiReady ? "Ask your coach… (Enter to send, Shift+Enter for a new line)" : "AI is not configured"}
            aria-label="Message"
            rows={2}
            maxLength={2000}
            disabled={!aiReady}
            className="min-h-12 resize-none"
          />
          <Button type="submit" size="icon" disabled={!aiReady || loading || !draft.trim()} aria-label="Send message">
            <SendHorizontal className="size-4" />
          </Button>
        </form>
        <CreditNote service="growth_coach" />
      </CardFooter>
    </Card>
  );
}
