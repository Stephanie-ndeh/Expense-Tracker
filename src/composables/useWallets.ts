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

export function useWallets() {
  const wallets = computed(() => state.wallets)

  function addWallet(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const wallet: Wallet = { id: uid(), name: trimmed, createdAt: Date.now() }
    state.wallets.push(wallet)
    activeWalletId.value = wallet.id
  }

  return {
    wallets,
    activeWalletId,
    defaultWalletId: computed(getDefaultWalletId),
    addWallet,
  }
}
