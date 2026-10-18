import { computed, reactive } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseEnabled } from '../lib/supabaseClient'

const state = reactive({
  session: null as Session | null,
  loading: supabaseEnabled,
  /** True from the moment Supabase's PASSWORD_RECOVERY event fires (the user clicked a reset-password
   *  email link) until updatePassword() succeeds — that event also creates a session, so isAuthenticated
   *  alone can't be used to decide whether to show the normal app or the set-new-password screen. */
  passwordRecovery: false,
})

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    state.session = data.session
    state.loading = false
  })
  supabase.auth.onAuthStateChange((event, session) => {
    state.session = session
    if (event === 'PASSWORD_RECOVERY') state.passwordRecovery = true
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

  async function resetPasswordForEmail(email: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) throw error
  }

  async function updatePassword(password: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    state.passwordRecovery = false
  }

  return {
    enabled: supabaseEnabled,
    loading: computed(() => state.loading),
    isAuthenticated,
    userEmail,
    passwordRecovery: computed(() => state.passwordRecovery),
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail,
    updatePassword,
  }
}
