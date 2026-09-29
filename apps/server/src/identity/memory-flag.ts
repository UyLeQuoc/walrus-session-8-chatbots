import { eq, people } from "@hippo/db";
import { db } from "../context.ts";

export async function setMemoryEnabled(personId: string, enabled: boolean): Promise<void> {
  await db.update(people).set({ memoryEnabled: enabled }).where(eq(people.id, personId));
}
