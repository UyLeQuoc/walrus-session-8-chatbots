import { ArrowUpRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TELEGRAM_BOT } from "@/lib/channels";

export function TelegramCard() {
  return (
    <a
      href={TELEGRAM_BOT.url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand/10 p-3 transition-colors hover:bg-brand/15 group-data-[collapsible=icon]:hidden"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Send className="size-4 text-brand" />
        hippo on Telegram
        <ArrowUpRight className="ml-auto size-4 text-muted-foreground" />
      </span>
      <span className="text-xs text-muted-foreground">
        Same memory on both: type /link here, then send the code to {TELEGRAM_BOT.handle}.
      </span>
    </a>
  );
}

export function TelegramButton() {
  return (
    <Button asChild variant="outline">
      <a href={TELEGRAM_BOT.url} target="_blank" rel="noreferrer">
        <Send className="text-brand" />
        Open in Telegram
      </a>
    </Button>
  );
}
