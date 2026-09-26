import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNewChatTick, useShellTitle } from "@/app/shell";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Examples, rememberPendingAsk, takePendingAsk } from "@/features/chat/examples";
import { greetingFor } from "@/features/chat/greeting";
import { Markdown } from "@/features/chat/markdown";
import { MemoryStrip } from "@/features/chat/memory-strip";
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
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const newChatTick = useNewChatTick();
  const seenTick = useRef(newChatTick);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  useEffect(() => {
    const pending = takePendingAsk();
    if (pending) setText(pending);
  }, []);

  useEffect(() => {
    if (seenTick.current === newChatTick) return;
    seenTick.current = newChatTick;
    setMessages([]);
    setText("");
  }, [newChatTick, setMessages]);

  const lastId = messages.at(-1)?.id;

  const send = (value: string) => {
    if (!value.trim() || busy) return;
    void sendMessage({ text: value });
    setText("");
  };

  const title = useMemo(() => threadTitle(messages), [messages]);
  useShellTitle(title);

  const reloadAndAsk = (value: string) => {
    rememberPendingAsk(value);
    window.location.reload();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <div data-slot="empty-cluster" className="flex w-full max-w-xl flex-col gap-10">
            <div data-slot="greeting" className="text-center">
              <p className="font-greeting text-2xl leading-tight tracking-tight sm:text-5xl">
                {greetingFor(new Date())}
              </p>
            </div>
            <ComposerDock text={text} setText={setText} send={send} busy={busy} />
            <div className="flex flex-col items-start gap-3">
              <Examples taught={false} onPick={send} onReloadAndAsk={reloadAndAsk} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <MessageScrollerProvider>
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
                  {messages.map((m) => (
                    <MessageScrollerItem key={m.id} scrollAnchor={m.role === "user"}>
                      <ChatTurn
                        message={m}
                        live={m.id === lastId && busy}
                        streaming={m.id === lastId && status === "streaming"}
                      />
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          <div
            data-slot="composer-dock"
            className="mx-auto flex w-full max-w-3xl shrink-0 flex-col px-4 pb-4"
          >
            <ComposerDock text={text} setText={setText} send={send} busy={busy} />
          </div>
        </>
      )}
    </div>
  );
}

function ComposerDock({
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
    <div className="flex flex-col gap-1">
      <Composer text={text} setText={setText} send={send} busy={busy} />
      <MemoryStrip />
    </div>
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
      <InputGroup className="overflow-hidden rounded-3xl">
        <InputGroupTextarea
          value={text}
          placeholder="Message hippo…"
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
        />
        <InputGroupAddon align="block-end" className="p-2">
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-sm"
            aria-label="Send"
            disabled={busy || text.trim() === ""}
            className="ml-auto size-8 rounded-full p-0"
          >
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
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

interface ChatMessage {
  id: string;
  role: string;
  parts?: Array<Record<string, unknown>>;
  metadata?: unknown;
}

function ChatTurn({
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
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent className="whitespace-pre-wrap">{spoken}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  const recalled =
    (message.metadata as { recalled?: RecalledMemory[] } | undefined)?.recalled ?? [];
  const tools = (message.parts ?? []).filter(
    (p) => p.type === "tool-remember" || p.type === "tool-recall",
  );
  const command = Boolean((message.metadata as { command?: boolean } | undefined)?.command);

  return (
    <Message>
      <MessageContent>
        <Recalled memories={recalled} />
        {tools.map((p, i) => (
          <ToolLine key={`${String(p.type)}-${i}`} part={p} />
        ))}
        {shown ? (
          command ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{shown}</pre>
          ) : (
            <Markdown>{shown}</Markdown>
          )
        ) : (
          live && <Thinking />
        )}
      </MessageContent>
    </Message>
  );
}

function ToolLine({ part }: { part: Record<string, unknown> }) {
  if (part.type === "tool-recall") {
    return <p className="text-sm text-muted-foreground">⟶ recalled</p>;
  }
  const input = part.input as { type?: string; text?: string } | undefined;
  const output = part.output as { saved?: boolean } | undefined;
  const done = part.state === "output-available";
  return (
    <p className="text-sm text-muted-foreground">
      {done && output?.saved === false ? "already knew" : "remembering"}
      {input?.type ? ` [${input.type}]` : ""} {input?.text ?? ""}
    </p>
  );
}
