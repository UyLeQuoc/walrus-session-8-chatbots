import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Landing } from "@/components/landing";
import { Recalled, type RecalledMemory } from "@/components/recalled";
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

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4">
        {messages.length === 0 && <Landing operatorAccountId={operatorAccountId} />}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                m.role === "user"
                  ? "inline-block rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                  : "inline-block rounded-lg bg-muted px-3 py-2"
              }
            >
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return (
                    <span key={i} className="whitespace-pre-wrap">
                      {p.text}
                    </span>
                  );
                if (p.type === "tool-remember") {
                  const input = p.input as { type?: string; text?: string } | undefined;
                  const output = p.output as { saved?: boolean; note?: string } | undefined;
                  const done = p.state === "output-available";
                  return (
                    <div key={i} className="mt-1 text-xs text-muted-foreground">
                      {done && output?.saved === false ? "already knew" : "remembering"}
                      {input?.type ? ` [${input.type}]` : ""} {input?.text ?? ""}
                    </div>
                  );
                }
                if (p.type === "tool-recall")
                  return (
                    <div key={i} className="mt-1 text-xs text-muted-foreground">
                      ⟶ recalled
                    </div>
                  );
                return null;
              })}
              {m.role === "assistant" && (
                <Recalled
                  memories={(m.metadata as { recalled?: RecalledMemory[] })?.recalled ?? []}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          void sendMessage({ text });
          setText("");
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
