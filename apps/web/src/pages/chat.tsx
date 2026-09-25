import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChatFrame } from "@/components/chat-frame";
import { Examples, rememberPendingAsk, takePendingAsk } from "@/components/examples";
import { Landing } from "@/components/landing";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import { MessageContent } from "@/components/prompt-kit/message";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import { Recalled, type RecalledMemory } from "@/components/recalled";
import { Thinking, useSmoothedText } from "@/components/streaming-text";
import { Button } from "@/components/ui/button";
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
  const { messages, sendMessage, setMessages, status, error } = useChat({ transport });
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
  // A command's answer (/help, /memory) teaches nothing, so it must not switch
  // the examples to "now prove it".
  const taught = messages.some(
    (m) => m.role === "assistant" && !(m.metadata as { command?: boolean } | undefined)?.command,
  );

  const send = (value: string) => {
    if (!value.trim() || busy) return;
    void sendMessage({ text: value });
    setText("");
  };

  // Nothing on the server lists past threads. Clearing is local: the next
  // message starts a fresh turn, and anything hippo kept is still on Walrus.
  const newChat = () => {
    setMessages([]);
    setText("");
  };

  const title = useMemo(() => threadTitle(messages), [messages]);

  return (
    <ChatFrame title={title} onNewChat={newChat}>
      {messages.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <Landing operatorAccountId={operatorAccountId} />
          </div>
        </div>
      ) : (
        <ChatContainerRoot>
          <ChatContainerContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
            {messages.map((m) => (
              <Message
                key={m.id}
                message={m}
                live={m.id === lastId && busy}
                streaming={m.id === lastId && status === "streaming"}
              />
            ))}
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <ScrollButton />
          </div>
        </ChatContainerRoot>
      )}

      <div className="mx-auto w-full max-w-3xl shrink-0 space-y-2 px-4 pb-4">
        <Examples
          taught={taught}
          onPick={send}
          onReloadAndAsk={(value) => {
            rememberPendingAsk(value);
            window.location.reload();
          }}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <PromptInput
            value={text}
            onValueChange={setText}
            onSubmit={() => send(text)}
            isLoading={busy}
            disabled={busy}
          >
            <PromptInputTextarea placeholder="Message hippo…" />
            <PromptInputActions className="justify-end px-1">
              <Button
                type="submit"
                size="icon"
                aria-label="Send"
                disabled={busy || text.trim() === ""}
                className="size-8 rounded-full"
              >
                <ArrowUp className="size-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </form>
      </div>
    </ChatFrame>
  );
}

function threadTitle(messages: Array<{ role: string; parts?: Array<Record<string, unknown>> }>) {
  const firstUser = messages.find((m) => m.role === "user");
  const line = textOf(firstUser?.parts).split("\n")[0]?.trim() ?? "";
  if (!line) return "New chat";
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}

function textOf(parts: Array<Record<string, unknown>> | undefined): string {
  return (parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => String(p.text ?? ""))
    .join("");
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
  const spoken = textOf(message.parts);
  const smoothed = useSmoothedText(spoken, !streaming);
  const shown = streaming ? smoothed : spoken;

  if (message.role === "user") {
    return (
      <div className="flex">
        <MessageContent className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-3xl bg-muted px-4 py-2.5 text-sm">
          {spoken}
        </MessageContent>
      </div>
    );
  }

  const recalled =
    (message.metadata as { recalled?: RecalledMemory[] } | undefined)?.recalled ?? [];
  const tools = (message.parts ?? []).filter(
    (p) => p.type === "tool-remember" || p.type === "tool-recall",
  );
  const command = Boolean((message.metadata as { command?: boolean } | undefined)?.command);

  return (
    <div className="space-y-2 text-sm">
      {tools.map((p, i) => (
        <ToolLine key={`${String(p.type)}-${i}`} part={p} />
      ))}
      {shown ? (
        command ? (
          // A command's answer is a table in plain text (/help, /memory); in a
          // proportional font its columns do not line up.
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{shown}</pre>
        ) : (
          <MessageContent markdown>{shown}</MessageContent>
        )
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
