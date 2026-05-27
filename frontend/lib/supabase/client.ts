import { createBrowserClient } from "@supabase/ssr";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Auto-strip trailing slashes to prevent double slashes in auth paths (which cause CORS failures)
  const url = rawUrl.replace(/\/+$/, "");
  const key = rawKey.trim();

  if (!url || !key || url.includes("your-supabase")) {
    console.error(
      `[StudyMind Supabase] Configuration Error! URL: "${url || "MISSING"}", Key: "${key ? "PRESENT" : "MISSING"}". ` +
      "Please verify your Vercel/environment configuration."
    );
  }

  // Always create a new instance on the server side (SSR / Server Component contexts)
  if (typeof window === "undefined") {
    return createBrowserClient(url, key);
  }

  // On the browser, use a singleton to prevent multiple instances from going out of sync
  if (!clientInstance) {
    clientInstance = createBrowserClient(url, key);
  }
  return clientInstance;
}
