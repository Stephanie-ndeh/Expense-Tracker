import { computed, reactive } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseEnabled } from '../lib/supabaseClient'

const state = reactive({
  session: null as Session | null,
  loading: supabaseEnabled,
})

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    state.session = data.session
    state.loading = false
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session
  })
}

export function useAuth() {
  const isAuthenticated = computed(() => !!state.session)
  const userEmail = computed(() => state.session?.user.email ?? null)

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return {
    enabled: supabaseEnabled,
    loading: computed(() => state.loading),
    isAuthenticated,
    userEmail,
    signIn,
    signUp,
    signOut,
  }
}
