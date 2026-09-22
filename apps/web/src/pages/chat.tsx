import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { Recalled, type RecalledMemory } from "@/components/recalled";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api";

export function ChatPage() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: `${API_URL}/api/chat`, credentials: "include" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4">
        {messages.length === 0 && (
          <div className="space-y-3 text-sm">
            <p className="text-foreground">
              Tell hippo something about yourself. It remembers across sessions, across channels,
              and the memory can belong to you rather than to the bot.
            </p>
            <ol className="space-y-1 text-muted-foreground">
              <li>
                <span className="text-foreground">1.</span> Say something like "I only use pnpm and
                I want short answers in Vietnamese."
              </li>
              <li>
                <span className="text-foreground">2.</span> Reload this page, so nothing is left in
                the conversation, and ask what it knows about you.
              </li>
              <li>
                <span className="text-foreground">3.</span> Every answer shows which memories it
                used, and each one links to its encrypted blob on Walrus.
              </li>
            </ol>
            <p className="text-muted-foreground">
              <code>/help</code> lists the commands. <code>/connect</code> moves the memory into a
              Walrus Memory account owned by your own wallet, where <code>/disconnect</code> takes
              hippo's access away on-chain.
            </p>
          </div>
        )}
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
                if (p.type === "tool-remember")
                  return (
                    <div key={i} className="mt-1 text-xs text-muted-foreground">
                      ⟶ remembered{" "}
                      {p.state === "output-available"
                        ? String((p.output as { outcome?: string })?.outcome ?? "")
                        : "…"}
                    </div>
                  );
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
        {error && <p className="text-sm text-destructive">{error.message}</p>}
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
