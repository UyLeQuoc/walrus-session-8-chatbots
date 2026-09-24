/**
 * How a reply that is not the model's reaches each client.
 *
 * Slash commands, the size guard and the rate limit answer without calling the
 * model. They used to answer with JSON everywhere, which suits the CLI and is
 * silently invisible in the web chat: `useChat` reads the response as a UI
 * message stream, finds no events in a JSON body, and shows nothing — no reply,
 * no error. Every command typed on the web, `/help` included, went nowhere.
 *
 * So the web gets the same text as a one-message stream, and the CLI keeps its
 * JSON, which also carries the files `/export` hands back. No imports from the
 * environment or the database, so this is tested in CI.
 */
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export interface ReplyFile {
  name: string;
  mime: string;
  content: string;
}

export function plainReply(channel: string, text: string, files?: ReplyFile[]): Response {
  if (channel === "cli") return Response.json({ command: true, text, files });
  const id = "reply";
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      // Marked, so the page can tell a command's answer from something the
      // model said after being taught a fact.
      writer.write({ type: "start", messageMetadata: { command: true } });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
