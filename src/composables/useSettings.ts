import { reactive } from 'vue'
import { supabase } from '../lib/supabaseClient'

const DEFAULT_CURRENCY = 'FCFA'

const state = reactive({
  currency: DEFAULT_CURRENCY,
})

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Called by useSync.ts right after sign-in: load the profile, or create one defaulting to FCFA if it doesn't exist yet. */
async function loadProfile() {
  if (!supabase) return
  const userId = await getUserId()
  if (!userId) return

  const { data, error } = await supabase.from('profiles').select('currency').eq('id', userId).maybeSingle()
  if (error) throw error

  if (data) {
    state.currency = data.currency
  } else {
    const { error: insertError } = await supabase.from('profiles').insert({ id: userId, currency: DEFAULT_CURRENCY })
    if (insertError) throw insertError
    state.currency = DEFAULT_CURRENCY
  }
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
  return { settings: state, format, updateCurrency }
}

export { loadProfile, clearSettings }
