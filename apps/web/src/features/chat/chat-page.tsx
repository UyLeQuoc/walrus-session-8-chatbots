import type { UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNewChatTick, useOpenTick, useShellTitle } from "@/app/shell";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { clearActiveChat, readActiveChat } from "@/features/chat/active-chat";
import { ChatTurn } from "@/features/chat/chat-turn";
import { applyComposerAction } from "@/features/chat/composer-action";
import { ComposerShell } from "@/features/chat/composer-shell";
import { Examples, rememberPendingAsk, takePendingAsk } from "@/features/chat/examples";
import { FollowUpRow } from "@/features/chat/follow-up-row";
import { GreetingLine } from "@/features/chat/greeting-line";
import { MemoryStrip } from "@/features/chat/memory-strip";
import { commandRoot, commandUsages } from "@/features/chat/slash-menu";
import { CommandGuide, SlashMenu } from "@/features/chat/slash-menu-panel";
import { useChatThread } from "@/features/chat/use-chat-thread";
import { useComposerMeter } from "@/features/chat/use-composer-meter";
import { bumpConversations } from "@/features/chat/use-conversations";
import { useFollowUps } from "@/features/chat/use-follow-ups";
import { useGreeting } from "@/features/chat/use-greeting";
import { useSlashMenu } from "@/features/chat/use-slash-menu";
import { useTranscript } from "@/features/chat/use-transcript";

export function ChatPage() {
  const {
    messages,
    busy,
    error,
    conversationId,
    send: submit,
    stop,
    retry,
    edit,
    resetConversation,
    openConversation,
    replaceMessages,
    status,
  } = useChatThread();
  const [text, setText] = useState("");
  const [loadId, setLoadId] = useState<string | null>(() => readActiveChat());
  const transcript = useTranscript(loadId);
  const newChatTick = useNewChatTick();
  const openTick = useOpenTick();
  const seenTick = useRef(newChatTick);
  const seenOpen = useRef(openTick);
  const applied = useRef(0);
  const wasBusy = useRef(false);

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
    setLoadId(null);
    resetConversation();
    setText("");
  }, [newChatTick, resetConversation]);

  useEffect(() => {
    if (openTick === 0 || seenOpen.current === openTick) return;
    seenOpen.current = openTick;
    const id = readActiveChat();
    setLoadId(id);
    openConversation(id);
  }, [openTick, openConversation]);

  useEffect(() => {
    if (transcript.generation === 0 || applied.current === transcript.generation) return;
    applied.current = transcript.generation;
    if (transcript.messages) replaceMessages(transcript.messages as UIMessage[]);
  }, [transcript.generation, transcript.messages, replaceMessages]);

  useEffect(() => {
    if (transcript.error) toast.error(transcript.error);
  }, [transcript.error]);

  useEffect(() => {
    if (busy) {
      wasBusy.current = true;
      return;
    }
    if (!wasBusy.current) return;
    wasBusy.current = false;
    bumpConversations();
  }, [busy]);

  const lastId = messages.at(-1)?.id;
  const lastUserId = lastIdOf(messages, "user");
  const lastAssistantId = lastIdOf(messages, "assistant");
  const last = messages.at(-1);
  const follow = useFollowUps({
    conversationId,
    busy,
    enabled: last?.role === "assistant" && !isCommand(last),
  });

  const send = (value: string) => {
    if (!value.trim() || busy) return;
    submit(value);
    setText("");
  };

  const title = useMemo(() => threadTitle(messages), [messages]);
  useShellTitle(title);
  const greeting = useGreeting();

  const reloadAndAsk = (value: string) => {
    clearActiveChat();
    rememberPendingAsk(value);
    window.location.reload();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <div data-slot="empty-cluster" className="flex w-full max-w-xl flex-col gap-10">
            <div data-slot="greeting" className="text-center">
              <GreetingLine text={greeting} />
            </div>
            <ComposerDock
              text={text}
              setText={setText}
              send={send}
              stop={() => void stop()}
              busy={busy}
              messages={messages}
            />
            <div className="flex flex-col items-start gap-3">
              <Examples taught={false} onPick={setText} onReloadAndAsk={reloadAndAsk} />
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
                        canEdit={!busy && m.id === lastUserId}
                        canAnswer={!busy && m.id === lastAssistantId}
                        onEdit={edit}
                        onRetry={retry}
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
            <FollowUpRow suggestions={follow.suggestions} onPick={setText} />
            <ComposerDock
              text={text}
              setText={setText}
              send={send}
              stop={stop}
              busy={busy}
              messages={messages}
            />
          </div>
        </>
      )}
    </div>
  );
}

function lastIdOf(messages: Array<{ id: string; role: string }>, role: string): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === role) return messages[i]?.id ?? null;
  }
  return null;
}

function isCommand(message: { metadata?: unknown }): boolean {
  return Boolean((message.metadata as { command?: boolean } | undefined)?.command);
}

function ComposerDock({
  text,
  setText,
  send,
  stop,
  busy,
  messages,
}: {
  text: string;
  setText: (value: string) => void;
  send: (value: string) => void;
  stop: () => void;
  busy: boolean;
  messages: UIMessage[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <Composer
        text={text}
        setText={setText}
        send={send}
        stop={stop}
        busy={busy}
        messages={messages}
      />
      <MemoryStrip />
    </div>
  );
}

function Composer({
  text,
  setText,
  send,
  stop,
  busy,
  messages,
}: {
  text: string;
  setText: (value: string) => void;
  send: (value: string) => void;
  stop: () => void;
  busy: boolean;
  messages: UIMessage[];
}) {
  const [pinned, setPinned] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const root = commandRoot(text);
  const guided = pinned !== null && root === pinned;
  const applyCommand = (command: string) => {
    setText(command);
    const next = commandRoot(command);
    setPinned(next);
    setGuideOpen(next !== null);
  };
  const slash = useSlashMenu({
    text,
    busy,
    pinned: guided,
    apply: applyCommand,
  });
  const meter = useComposerMeter(messages, text);
  const submit = () => {
    applyComposerAction({ busy, text, send, stop });
  };
  const onText = (value: string) => {
    setText(value);
    if (pinned && commandRoot(value) !== pinned) {
      setPinned(null);
      setGuideOpen(false);
    }
  };
  return (
    <Popover
      open={slash.open || (guided && guideOpen)}
      modal={false}
      onOpenChange={(next) => {
        if (next) return;
        slash.dismiss();
        setGuideOpen(false);
      }}
    >
      <PopoverAnchor asChild>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <ComposerShell
            text={text}
            onText={onText}
            disabled={busy}
            busy={busy}
            meter={meter}
            command={guided}
            onKeyDown={(e) => {
              if (slash.onKeyDown(e.key) === "handled") {
                e.preventDefault();
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </form>
      </PopoverAnchor>
      {slash.open ? (
        <SlashMenu
          items={slash.items}
          active={slash.active}
          onHighlight={slash.highlight}
          onRun={slash.run}
        />
      ) : guided && guideOpen && root ? (
        <CommandGuide lines={commandUsages(root)} onPick={applyCommand} />
      ) : null}
    </Popover>
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
