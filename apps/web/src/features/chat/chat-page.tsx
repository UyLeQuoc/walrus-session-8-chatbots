import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
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
import { Button } from "@/components/ui/button";
import { ChatFrame } from "@/features/chat/chat-frame";
import { Examples, rememberPendingAsk, takePendingAsk } from "@/features/chat/examples";
import { greetingFor } from "@/features/chat/greeting";
import { Recalled, type RecalledMemory } from "@/features/chat/recalled";
import { Thinking, useSmoothedText } from "@/features/chat/streaming-text";
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
  const busy = status === "submitted" || status === "streaming";

  // A failed turn used to leave a red line under the transcript that nothing
  // ever cleared, so the next successful answer appeared beneath a stale error.
  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

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
  const reloadAndAsk = (value: string) => {
    rememberPendingAsk(value);
    window.location.reload();
  };

  return (
    <ChatFrame title={title} onNewChat={newChat}>
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <div data-slot="empty-cluster" className="flex w-full max-w-xl flex-col gap-2">
            <div data-slot="greeting" className="flex items-center gap-3">
              <Logo variant="mark" wordSize={40} alt="" />
              <p className="text-3xl font-medium tracking-tight">{greetingFor(new Date())}</p>
            </div>
            <Composer text={text} setText={setText} send={send} busy={busy} />
            <Examples taught={false} onPick={send} onReloadAndAsk={reloadAndAsk} />
          </div>
        </div>
      ) : (
        <>
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
          <div
            data-slot="composer-dock"
            className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-1 px-4 pb-4"
          >
            {taught ? <Examples taught onPick={send} onReloadAndAsk={reloadAndAsk} /> : null}
            <Composer text={text} setText={setText} send={send} busy={busy} />
          </div>
        </>
      )}
    </ChatFrame>
  );
}

function Composer({
  text,
  setText,
  send,
  busy,
}: {
  text: string;
  setText: (value: string) => void;
  send: (value: string) => void;
  busy: boolean;
}) {
  return (
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
