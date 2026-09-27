import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const lineClass = "text-2xl font-normal leading-tight tracking-tight sm:text-5xl";

export function GreetingLine({ text }: { text: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <p className={lineClass}>{text}</p>;

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={text}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className={lineClass}
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}
