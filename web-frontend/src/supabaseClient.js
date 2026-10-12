import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseUrl = rawUrl.trim();
try {
  if (supabaseUrl) {
    supabaseUrl = new URL(supabaseUrl).origin;
  }
} catch (e) {
  supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('http') &&
  supabaseKey.length > 5
);

// Fallback dummy URL and key if environment variables are not set, preventing runtime crash on startup
const safeUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const safeKey = supabaseKey || 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});