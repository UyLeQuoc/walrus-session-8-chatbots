import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MemoryPanel({
  open,
  mobile,
  onClose,
  children,
}: {
  open: boolean;
  mobile: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const body = <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  if (mobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Memory</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  if (!open) return null;
  return (
    <aside data-slot="memory-panel" className="flex w-80 shrink-0 flex-col border-l">
      <div className="flex items-center justify-end px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close memory"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      {body}
    </aside>
  );
}
