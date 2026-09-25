/**
 * What hippo says before the first message, picked from the reader's own clock.
 * `getHours` is local, so a machine in the evening is not greeted as morning
 * just because the server is on UTC.
 */
export const GREETINGS = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
} as const;

export type Greeting = (typeof GREETINGS)[keyof typeof GREETINGS];

export function greetingFor(date: Date): Greeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return GREETINGS.morning;
  if (hour >= 12 && hour < 17) return GREETINGS.afternoon;
  if (hour >= 17 && hour < 21) return GREETINGS.evening;
  return GREETINGS.night;
}
