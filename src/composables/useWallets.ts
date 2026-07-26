import { computed, reactive, ref, watch } from 'vue'
import type { Wallet } from '../types/wallet'

const STORAGE_KEY = 'ledger.wallets.v1'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function load(): Wallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Wallet[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  const seeded: Wallet[] = [{ id: uid(), name: 'Personal', createdAt: Date.now() }]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

const state = reactive({
  wallets: load(),
})

watch(
  () => state.wallets,
  (val) => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)),
  { deep: true },
)

/** Shared across every consumer — the active tab on the home view. 'all' means unscoped. */
export const activeWalletId = ref<string>('all')

/** Module-scope helper so `useLedger.ts` can migrate legacy transactions before any composable runs. */
export function getDefaultWalletId(): string {
  return state.wallets[0]?.id ?? ''
}

/** Fired whenever a wallet is added locally, so `useSync.ts` can push it up without a circular import. */
const mutationListeners: ((wallet: Wallet) => void)[] = []
export function onWalletMutation(fn: (wallet: Wallet) => void) {
  mutationListeners.push(fn)
}
function notify(wallet: Wallet) {
  mutationListeners.forEach((fn) => fn(wallet))
}

export function useWallets() {
  const wallets = computed(() => state.wallets)

  function addWallet(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const wallet: Wallet = { id: uid(), name: trimmed, createdAt: Date.now() }
    state.wallets.push(wallet)
    activeWalletId.value = wallet.id
    notify(wallet)
  }

  function importWallets(incoming: Wallet[], mode: 'merge' | 'replace') {
    if (mode === 'replace') {
      state.wallets = incoming
      return
    }
    const existingIds = new Set(state.wallets.map((w) => w.id))
    for (const w of incoming) {
      if (!existingIds.has(w.id)) {
        state.wallets.push(w)
        notify(w)
      }
    }
  }

  /** Pull-merge from Supabase: add anything new, drop anything tombstoned remotely. No `notify` — would just push it right back. */
  function applyRemoteWallets(items: Wallet[], deletedIds: string[] = []) {
    if (deletedIds.length) {
      const del = new Set(deletedIds)
      state.wallets = state.wallets.filter((w) => !del.has(w.id))
    }
    const existingIds = new Set(state.wallets.map((w) => w.id))
    for (const w of items) {
      if (!existingIds.has(w.id)) state.wallets.push(w)
    }
  }

  return {
    wallets,
    activeWalletId,
    defaultWalletId: computed(getDefaultWalletId),
    addWallet,
    importWallets,
    applyRemoteWallets,
  }
}
