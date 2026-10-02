import { Section } from "@/features/me/section";
import type { MemoryUsage } from "@/features/me/use-usage";

export function UsagePanel({ usage }: { usage: MemoryUsage }) {
  const share = Math.round((usage.withMemory / usage.answers) * 100);
  return (
    <Section
      title="Memory at work"
      description="Every answer records which of your memories it used, on every channel. This counts blob ids; the words stay on Walrus."
    >
      <p className="text-2xl font-medium">
        {usage.withMemory} of {usage.answers} answers used your memory
      </p>
      <p className="text-sm text-muted-foreground">
        That is {share}%. The table below says how often each memory was used.
      </p>
    </Section>
  );
}
