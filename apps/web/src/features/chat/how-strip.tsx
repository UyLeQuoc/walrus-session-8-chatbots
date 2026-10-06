import { ArrowRight, Lock, MessageSquare, RotateCcw } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";

const STEPS = [
  { icon: MessageSquare, label: "Tell it once" },
  { icon: Lock, label: "Sealed on Walrus" },
  { icon: RotateCcw, label: "Remembered in a new chat" },
];

export function HowStrip() {
  return (
    <div className="flex flex-col items-center gap-2">
      <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {STEPS.map((step, index) => (
          <Fragment key={step.label}>
            {index > 0 ? <ArrowRight aria-hidden className="size-3.5" /> : null}
            <li className="flex items-center gap-1.5">
              <step.icon aria-hidden className="size-4" />
              {step.label}
            </li>
          </Fragment>
        ))}
      </ol>
      <Link to="/guide" className="text-sm text-muted-foreground underline underline-offset-4">
        How it works
      </Link>
    </div>
  );
}
