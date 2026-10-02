import { z } from "zod";

const EnokiEnv = z.object({
  apiKey: z.string().startsWith("enoki_public_"),
  clientId: z.string().endsWith(".apps.googleusercontent.com"),
});

export type EnokiConfig = z.infer<typeof EnokiEnv>;

/**
 * Google must list the redirect exactly, and Enoki defaults it to the current
 * URL, which on /connect carries a one-time token. One fixed static page is
 * the only address that can be registered ahead of time.
 */
export const GOOGLE_REDIRECT_PATH = "/auth-callback.html";

export function enokiConfig(env: Record<string, unknown>): EnokiConfig | null {
  const parsed = EnokiEnv.safeParse({
    apiKey: env.VITE_ENOKI_API_KEY,
    clientId: env.VITE_GOOGLE_CLIENT_ID,
  });
  return parsed.success ? parsed.data : null;
}
