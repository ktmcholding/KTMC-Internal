import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether real backend credentials are present. When false the app runs in
 * "demo" mode: auth accepts any login and data is persisted to localStorage.
 * When true, auth, data and document storage all run through Supabase.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/** Storage bucket that holds client documents. */
export const DOCUMENTS_BUCKET = "client-documents";
