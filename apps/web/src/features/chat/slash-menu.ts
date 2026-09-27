import { CHANNEL_COMMANDS } from "@hippo/core/commands";
import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Library,
  Link,
  Lock,
  Unplug,
  User,
  Users,
} from "lucide-react";

export interface SlashItem {
  command: string;
  description: string;
  icon: LucideIcon;
}

const ICONS: Record<(typeof CHANNEL_COMMANDS)[number]["name"], LucideIcon> = {
  memory: Library,
  whoami: User,
  proof: Fingerprint,
  export: Download,
  link: Link,
  team: Users,
  connect: KeyRound,
  disconnect: Unplug,
  privacy: Lock,
  help: CircleHelp,
};

const TOGGLES: SlashItem[] = [
  { command: "/memory on", description: "start remembering again", icon: Eye },
  { command: "/memory off", description: "stop remembering new facts", icon: EyeOff },
];

export const SLASH_ITEMS: SlashItem[] = CHANNEL_COMMANDS.flatMap((command) => {
  const item = {
    command: `/${command.name}`,
    description: command.description,
    icon: ICONS[command.name],
  };
  return command.name === "memory" ? [item, ...TOGGLES] : [item];
});

/** The text after `/` when the draft is choosing a command, otherwise null. */
export function slashDraft(text: string): string | null {
  if (!text.startsWith("/") || text.includes("\n")) return null;
  return text.slice(1);
}

export function filterSlashCommands(query: string): SlashItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((item) => item.command.slice(1).toLowerCase().startsWith(needle));
}

export type SlashKeyAction =
  | { type: "run"; index: number }
  | { type: "move"; index: number }
  | { type: "dismiss" }
  | { type: "ignore" };

export function slashKeyAction(key: string, index: number, count: number): SlashKeyAction {
  if (count === 0) return { type: "ignore" };
  switch (key) {
    case "Enter":
      return { type: "run", index };
    case "ArrowDown":
      return { type: "move", index: (index + 1) % count };
    case "ArrowUp":
      return { type: "move", index: (index - 1 + count) % count };
    case "Escape":
      return { type: "dismiss" };
    default:
      return { type: "ignore" };
  }
}
