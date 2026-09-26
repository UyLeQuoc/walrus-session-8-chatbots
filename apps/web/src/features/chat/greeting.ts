/**
 * What hippo says before the first message, picked from the reader's own clock.
 * `getHours` is local, so a machine in the evening is not greeted as morning
 * just because the server is on UTC. The line stays the same for a given day,
 * so a re-render does not swap the sentence under the cursor.
 */
export const GREETINGS = {
  morning: [
    "Good morning",
    "Morning",
    "Good morning to you",
    "A quiet morning",
    "Morning, ready when you are",
    "Good morning, let's begin",
  ],
  afternoon: [
    "Good afternoon",
    "Afternoon",
    "Good afternoon to you",
    "A calm afternoon",
    "Afternoon, ready when you are",
    "Good afternoon, let's begin",
  ],
  evening: [
    "Good evening",
    "Evening",
    "Good evening to you",
    "A quiet evening",
    "Evening, ready when you are",
    "Good evening, let's begin",
  ],
  night: [
    "Good night",
    "Still up",
    "Late night",
    "A quiet night",
    "Night, ready when you are",
    "Good night, let's begin",
  ],
} as const;

export type Greeting = (typeof GREETINGS)[keyof typeof GREETINGS][number];

function pick<T extends string>(lines: readonly T[], date: Date): T {
  const day = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
  return lines[day % lines.length] ?? lines[0];
}

export function greetingFor(date: Date): Greeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return pick(GREETINGS.morning, date);
  if (hour >= 12 && hour < 17) return pick(GREETINGS.afternoon, date);
  if (hour >= 17 && hour < 21) return pick(GREETINGS.evening, date);
  return pick(GREETINGS.night, date);
}
