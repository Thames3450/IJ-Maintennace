import {sessionFetch} from './employeeSession.js'
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hftlogubohbjiivcvkut.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FtRkkKGWJpOakcv69BX-Hw_RHFCD86n'

// Employee-code login uses an opaque server session, checked by IJ RLS and RPCs.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: sessionFetch(SUPABASE_URL) },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})
