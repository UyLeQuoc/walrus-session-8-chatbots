import { ArrowUp, Plus, Square } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ComposerMeter, formatContext, formatPrice } from "./composer-meter";

export function ComposerShell({
  text,
  onText,
  onKeyDown,
  disabled,
  busy,
  meter,
  command,
}: {
  text: string;
  onText: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  busy: boolean;
  meter: ComposerMeter;
  command?: boolean;
}) {
  return (
    <div
      data-slot="composer-shell"
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-3xl border border-input bg-background shadow-md dark:bg-input/30 dark:shadow-xs",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        "[&>textarea]:field-sizing-content [&>textarea]:block [&>textarea]:min-h-16 [&>textarea]:w-full [&>textarea]:resize-none [&>textarea]:border-0 [&>textarea]:bg-transparent [&>textarea]:p-4 [&>textarea]:text-base [&>textarea]:whitespace-pre-wrap [&>textarea]:outline-none [&>textarea]:placeholder:text-muted-foreground [&>textarea]:disabled:cursor-not-allowed [&>textarea]:disabled:opacity-50",
        command && "[&>textarea]:text-transparent [&>textarea]:caret-foreground",
      )}
    >
      {command ? <CommandPaint text={text} /> : null}
      <textarea
        value={text}
        placeholder="Message hippo…"
        disabled={disabled}
        rows={1}
        onChange={(event) => onText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="flex items-center gap-2 px-2 pb-2">
        <Button type="button" variant="ghost" size="icon" disabled aria-label="Add">
          <Plus />
        </Button>
        <div className="ml-auto flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
          <span className="truncate">{meter.label}</span>
          <span className="shrink-0">{formatContext(meter)}</span>
          <span className="shrink-0">{formatPrice(meter.priceUsd)}</span>
        </div>
        <Button
          type="submit"
          size="icon"
          aria-label={busy ? "Stop" : "Send"}
          disabled={!busy && text.trim() === ""}
          className="rounded-full"
        >
          {busy ? <Square className="fill-current" /> : <ArrowUp />}
        </Button>
      </div>
    </div>
  );
}

function CommandPaint({ text }: { text: string }) {
  const space = text.indexOf(" ");
  const command = space === -1 ? text : text.slice(0, space);
  const rest = space === -1 ? "" : text.slice(space);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 min-h-16 p-4 text-base whitespace-pre-wrap wrap-break-word"
    >
      <span data-command-token className="text-[#156BC1] dark:text-[#8EBEF5]">
        {command}
      </span>
      <span data-command-rest className="text-foreground">
        {rest}
      </span>
    </div>
  );
}
