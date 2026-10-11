import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hftlogubohbjiivcvkut.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FtRkkKGWJpOakcv69BX-Hw_RHFCD86n'

export const IJ_SESSION_KEY = 'ij_session_token'
export const getIJSessionToken = () => {
  try { return typeof localStorage !== 'undefined' ? (localStorage.getItem(IJ_SESSION_KEY) || '') : '' } catch { return '' }
}
export const setIJSessionToken = token => {
  try {
    if (typeof localStorage === 'undefined') return
    if (token) localStorage.setItem(IJ_SESSION_KEY, token)
    else localStorage.removeItem(IJ_SESSION_KEY)
  } catch {}
}
export const clearIJSessionToken = () => setIJSessionToken('')

// Employee-ID login creates a short-lived IJ web session in Supabase.
// Every request automatically sends that session in x-ij-session so the
// RESTRICTIVE IJ RLS policies can identify the current role.
const sessionFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {})
  const token = getIJSessionToken()
  if (token) headers.set('x-ij-session', token)
  return fetch(input, { ...init, headers })
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: sessionFetch }
})
