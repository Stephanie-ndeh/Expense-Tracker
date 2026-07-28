import { computed, reactive, ref } from 'vue'
import type { Wallet } from '../types/wallet'
import { supabase } from '../lib/supabaseClient'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export type WalletRow = {
  id: string
  name: string
  is_default: boolean
  created_at: number | string
}

export function rowToWallet(r: WalletRow): Wallet {
  return { id: r.id, name: r.name, isDefault: r.is_default, createdAt: Number(r.created_at) }
}

const state = reactive({
  wallets: [] as Wallet[],
})

/** Shared across every consumer — the active tab on the home view. 'all' means unscoped. */
export const activeWalletId = ref<string>('all')

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function useWallets() {
  const wallets = computed(() => state.wallets)
  const defaultWalletId = computed(() => state.wallets.find((w) => w.isDefault)?.id ?? state.wallets[0]?.id ?? '')

  async function addWallet(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (state.wallets.some((w) => w.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`A wallet named "${trimmed}" already exists.`)
    }
    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const wallet: Wallet = { id: uid(), name: trimmed, isDefault: false, createdAt: Date.now() }
    const { error } = await supabase.from('wallets').insert({
      id: wallet.id,
      user_id: userId,
      name: wallet.name,
      is_default: false,
      created_at: wallet.createdAt,
    })
    if (error) {
      throw error.code === '23505' ? new Error(`A wallet named "${trimmed}" already exists.`) : error
    }
    state.wallets.push(wallet)
    activeWalletId.value = wallet.id
  }

  async function removeWallet(id: string) {
    const wallet = state.wallets.find((w) => w.id === id)
    if (!wallet) return
    if (wallet.isDefault) throw new Error("The default wallet can't be deleted.")
    if (!supabase) throw new Error('Supabase is not configured')

    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_id', id)
    if (countError) throw countError
    if (count) {
      throw new Error(`This wallet still has ${count} ${count === 1 ? 'entry' : 'entries'} — delete or move them first.`)
    }

    const { error } = await supabase.from('wallets').delete().eq('id', id)
    if (error) throw error

    const idx = state.wallets.findIndex((w) => w.id === id)
    if (idx !== -1) state.wallets.splice(idx, 1)
    if (activeWalletId.value === id) activeWalletId.value = 'all'
  }

  /** Called by useSync.ts right after a fresh login finds zero wallets for this user. */
  async function createDefaultWallet() {
    if (!supabase) return
    const userId = await getUserId()
    if (!userId) return
    const wallet: Wallet = { id: uid(), name: 'Personal', isDefault: true, createdAt: Date.now() }
    const { error } = await supabase.from('wallets').insert({
      id: wallet.id,
      user_id: userId,
      name: wallet.name,
      is_default: true,
      created_at: wallet.createdAt,
    })
    if (error) throw error
    state.wallets.push(wallet)
  }

  /** Backup restore: add anything not already present locally (by id or name), skip the rest. Never imports as default. */
  async function importWallets(items: Wallet[]) {
    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const existingIds = new Set(state.wallets.map((w) => w.id))
    const existingNames = new Set(state.wallets.map((w) => w.name.toLowerCase()))
    for (const w of items) {
      if (existingIds.has(w.id) || existingNames.has(w.name.toLowerCase())) continue
      const { error } = await supabase.from('wallets').insert({
        id: w.id,
        user_id: userId,
        name: w.name,
        is_default: false,
        created_at: w.createdAt,
      })
      if (error) continue
      state.wallets.push({ ...w, isDefault: false })
      existingIds.add(w.id)
      existingNames.add(w.name.toLowerCase())
    }
  }

  /** Authoritative overwrite from Supabase — the server is the only source of truth, so no merge. */
  function replaceWallets(items: Wallet[]) {
    state.wallets = items
  }

  function clearWallets() {
    state.wallets = []
    activeWalletId.value = 'all'
  }

  return {
    wallets,
    activeWalletId,
    defaultWalletId,
    addWallet,
    removeWallet,
    createDefaultWallet,
    importWallets,
    replaceWallets,
    clearWallets,
  }
}
