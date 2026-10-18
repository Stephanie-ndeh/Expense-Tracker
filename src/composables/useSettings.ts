import { reactive } from 'vue'
import { supabase } from '../lib/supabaseClient'

const DEFAULT_CURRENCY = 'FCFA'
const THEME_KEY = 'reckon.theme.v1'

export type Theme = 'system' | 'light' | 'dark'

const state = reactive({
  currency: DEFAULT_CURRENCY,
})

function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall back to system.
  }
  return 'system'
}

const themeState = reactive({ theme: loadTheme() })

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (themeState.theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', themeState.theme)
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolveTheme(themeState.theme) === 'dark' ? '#12151c' : '#f7f5f0')
}

function setTheme(theme: Theme) {
  themeState.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore — theme just won't persist across reloads
  }
  applyTheme()
}

applyTheme()

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themeState.theme === 'system') applyTheme()
  })
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Called by useSync.ts right after sign-in: load the profile, or create one defaulting to FCFA if it doesn't exist yet. */
/** Returns true only when this call just inserted the profile row — i.e. a genuinely first-ever sign-in,
 *  as opposed to merely "the user currently has zero of something." Used to gate one-time new-account
 *  seeding (default categories) without ever re-triggering it for an existing account. */
async function loadProfile(): Promise<boolean> {
  if (!supabase) return false
  const userId = await getUserId()
  if (!userId) return false

  const { data, error } = await supabase.from('profiles').select('currency').eq('id', userId).maybeSingle()
  if (error) throw error

  if (data) {
    state.currency = data.currency
    return false
  }

  const { error: insertError } = await supabase.from('profiles').insert({ id: userId, currency: DEFAULT_CURRENCY })
  if (insertError) throw insertError
  state.currency = DEFAULT_CURRENCY
  return true
}

async function updateCurrency(value: string) {
  const trimmed = value.trim() || DEFAULT_CURRENCY
  if (!supabase) throw new Error('Supabase is not configured')
  const userId = await getUserId()
  if (!userId) throw new Error('Not signed in')

  const { error } = await supabase.from('profiles').update({ currency: trimmed }).eq('id', userId)
  if (error) throw error
  state.currency = trimmed
}

function clearSettings() {
  state.currency = DEFAULT_CURRENCY
}

export function useSettings() {
  function format(amount: number) {
    const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))
    return `${n} ${state.currency}`
  }
  return { settings: state, format, updateCurrency, theme: themeState, setTheme }
}

export { loadProfile, clearSettings }
