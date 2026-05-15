import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = !!url && !!key;

// createClient requires a valid URL — use a no-op placeholder when not configured
// so the static export doesn't throw at build/prerender time.
export const supabase = createClient(
  isConfigured ? url : "https://placeholder.supabase.co",
  isConfigured ? key : "placeholder-anon-key"
);
