import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Examples, rememberPendingAsk, takePendingAsk } from "@/components/examples";
import { Landing } from "@/components/landing";
import { Recalled, type RecalledMemory } from "@/components/recalled";
import { StreamingWords, Thinking, useSmoothedText } from "@/components/streaming-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL, identityHeaders } from "@/lib/api";

export function ChatPage() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/chat`,
        credentials: "include",
        headers: identityHeaders,
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [text, setText] = useState("");
  const [operatorAccountId, setOperatorAccountId] = useState<string | undefined>();
  const busy = status === "submitted" || status === "streaming";

  // A failed turn used to leave a red line under the transcript that nothing
  // ever cleared, so the next successful answer appeared beneath a stale error.
  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  // Only the landing section needs this, and only until the first message, so a
  // failure here must never keep the page from answering.
  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/api/config`)
      .then((r) => r.json() as Promise<{ operatorAccountId?: string }>)
      .then((d) => {
        if (!cancelled) setOperatorAccountId(d.operatorAccountId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Set before a reload by "Reload, then ask", so the demo is two clicks rather
  // than a reload plus remembering what to type.
  useEffect(() => {
    const pending = takePendingAsk();
    if (pending) setText(pending);
  }, []);

  const lastId = messages.at(-1)?.id;
  const taught = messages.some((m) => m.role === "assistant");

  const send = (value: string) => {
    if (!value.trim() || busy) return;
    void sendMessage({ text: value });
    setText("");
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-3">
      <div className="flex-1 space-y-5 overflow-y-auto rounded-lg border p-4">
        {messages.length === 0 && <Landing operatorAccountId={operatorAccountId} />}
        {messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            live={m.id === lastId && busy}
            streaming={m.id === lastId && status === "streaming"}
          />
        ))}
      </div>
      <Examples
        taught={taught}
        onPick={send}
        onReloadAndAsk={(value) => {
          rememberPendingAsk(value);
          window.location.reload();
        }}
      />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          disabled={busy}
        />
        <Button type="submit" disabled={busy}>
          Send
        </Button>
      </form>
    </div>
  );
}

/**
 * The user speaks in a bubble; hippo does not.
 *
 * Both sides used to be bubbles, which cramped every answer longer than a line
 * and made the two voices compete. The asymmetry is the convention for a reason:
 * what you said is a quoted artefact, what the assistant says is the page.
 */
interface ChatMessage {
  id: string;
  role: string;
  parts?: Array<Record<string, unknown>>;
  metadata?: unknown;
}

function Message({
  message,
  live,
  streaming,
}: {
  message: ChatMessage;
  live: boolean;
  streaming: boolean;
}) {
  const parts: Array<Record<string, unknown>> = message.parts ?? [];
  const spoken = parts
    .filter((p) => p.type === "text")
    .map((p) => String(p.text ?? ""))
    .join("");
  const smoothed = useSmoothedText(spoken, !streaming);
  const shown = streaming ? smoothed : spoken;

  if (message.role === "user") {
    return (
      <div className="flex">
        <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
          {spoken}
        </div>
      </div>
    );
  }

  const recalled =
    (message.metadata as { recalled?: RecalledMemory[] } | undefined)?.recalled ?? [];
  const tools = parts.filter((p) => p.type === "tool-remember" || p.type === "tool-recall");

  return (
    <div className="space-y-1.5 text-sm">
      {tools.map((p, i) => (
        <ToolLine key={`${p.type as string}-${i}`} part={p} />
      ))}
      {shown ? (
        <p className="whitespace-pre-wrap leading-relaxed">
          {streaming ? <StreamingWords text={shown} /> : shown}
        </p>
      ) : (
        live && <Thinking />
      )}
      <Recalled memories={recalled} />
    </div>
  );
}

/** What hippo did while answering, in one muted line. */
function ToolLine({ part }: { part: Record<string, unknown> }) {
  if (part.type === "tool-recall") {
    return <p className="text-xs text-muted-foreground">⟶ recalled</p>;
  }
  const input = part.input as { type?: string; text?: string } | undefined;
  const output = part.output as { saved?: boolean } | undefined;
  const done = part.state === "output-available";
  return (
    <p className="text-xs text-muted-foreground">
      {done && output?.saved === false ? "already knew" : "remembering"}
      {input?.type ? ` [${input.type}]` : ""} {input?.text ?? ""}
    </p>
  );
}
