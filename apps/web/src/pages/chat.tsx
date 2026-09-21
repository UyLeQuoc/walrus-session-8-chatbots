import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
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
          <p className="text-sm text-muted-foreground">
            Tell hippo something about yourself. It remembers across sessions, and the memory is
            yours.
          </p>
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
