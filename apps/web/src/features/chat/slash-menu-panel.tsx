import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { PopoverContent } from "@/components/ui/popover";
import type { SlashItem } from "@/features/chat/slash-menu";
import { cn } from "@/lib/utils";

export function SlashMenu({
  items,
  active,
  onHighlight,
  onRun,
}: {
  items: SlashItem[];
  active: number;
  onHighlight: (index: number) => void;
  onRun: (item: SlashItem) => void;
}) {
  return (
    <PopoverContent
      side="top"
      align="start"
      sideOffset={8}
      onOpenAutoFocus={(event) => event.preventDefault()}
      onCloseAutoFocus={(event) => event.preventDefault()}
      className="w-(--radix-popover-trigger-width) p-1"
    >
      <Command shouldFilter={false}>
        <CommandList aria-label="Commands" className="scroll-fade-y">
          {items.map((item, index) => (
            <CommandItem
              key={item.command}
              value={item.command}
              onMouseEnter={() => onHighlight(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                onRun(item);
              }}
              className={cn(index === active && "bg-accent text-accent-foreground")}
            >
              <item.icon className="text-muted-foreground" />
              <span className="shrink-0 font-medium">{item.command}</span>
              <span className="min-w-0 truncate text-muted-foreground">{item.description}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </PopoverContent>
  );
}
