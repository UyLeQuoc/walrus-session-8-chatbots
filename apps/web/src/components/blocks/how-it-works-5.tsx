/**
 * Installed from React Bits Pro (`@reactbits-pro/how-it-works-5`) and rewritten
 * to this codebase's design system, which is what their own guidance asks for
 * when a block lands in an existing page: the host wins.
 *
 * What survived is the idea worth having, a numbered sequence rather than three
 * equal cards, because these steps happen in an order. What did not: a
 * full-viewport section, a 1400px container, a `text-6xl` heading that would
 * have dwarfed the page's own h1, hardcoded neutral colours, and a marketing
 * CTA. This landing lives inside a scrolling chat panel, so density matters
 * more than presence.
 *
 * The reveal is on mount, not on scroll. The block used `whileInView`, which is
 * right for a section a reader scrolls down to and wrong here: this landing is
 * entirely above the fold inside a chat panel, so every step is already visible
 * when the page paints. Watched on production, the third step took several
 * seconds to settle waiting for an intersection that had already happened.
 */
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    label: "now",
    title: "Talk to it",
    desc: "Say something about yourself. hippo decides what is worth keeping, writes it to Walrus encrypted, and shows you which memories it used in every answer.",
  },
  {
    label: "/connect",
    title: "Take ownership",
    desc: "Sign one transaction and new memories go into a Walrus Memory account you own on Sui. hippo keeps only a delegate key. Gas is normally sponsored.",
  },
  {
    label: "/disconnect",
    title: "Take it away",
    desc: "Remove that key on chain and hippo stops being able to read or write, within about a minute. Nobody has to be asked, and hippo does not have to cooperate.",
  },
];

export default function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <ol className="flex flex-col gap-4">
      {steps.map((s, i) => (
        <motion.li
          key={s.title}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: Math.min(i, 5) * 0.06 }}
          className="flex items-start gap-3"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground"
          >
            {i + 1}
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{s.title}</span>
              <Badge variant="outline">{s.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
