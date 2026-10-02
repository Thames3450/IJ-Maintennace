import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hftlogubohbjiivcvkut.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FtRkkKGWJpOakcv69BX-Hw_RHFCD86n'

// v13 direct-access mode: no user-facing login.
// Requests use the Supabase publishable key and IJ-scoped RLS policies.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})
