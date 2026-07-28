import { reactive, computed, watch } from 'vue'
import { supabase, supabaseEnabled } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { useLedger, rowToTransaction } from './useLedger'
import { useWallets, rowToWallet } from './useWallets'

const status = reactive({
  syncing: false,
  lastSyncedAt: null as number | null,
  error: null as string | null,
})

async function loadAll() {
  if (!supabase) return
  status.syncing = true
  status.error = null
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return

    const { wallets, replaceWallets, createDefaultWallet } = useWallets()
    const { replaceTransactions } = useLedger()

    const [{ data: walletRows, error: walletsError }, { data: txRows, error: txError }] = await Promise.all([
      supabase.from('wallets').select('*'),
      supabase.from('transactions').select('*'),
    ])
    if (walletsError) throw walletsError
    if (txError) throw txError

    replaceWallets((walletRows ?? []).map(rowToWallet))
    replaceTransactions((txRows ?? []).map(rowToTransaction))

    if (!wallets.value.length) await createDefaultWallet()

    status.lastSyncedAt = Date.now()
  } catch (err) {
    status.error = err instanceof Error ? err.message : 'Sync failed'
  } finally {
    status.syncing = false
  }
}

function clearAll() {
  useWallets().clearWallets()
  useLedger().clearTransactions()
  status.lastSyncedAt = null
  status.error = null
}

let intervalId: ReturnType<typeof setInterval> | null = null

if (supabaseEnabled) {
  const { isAuthenticated } = useAuth()
  watch(
    isAuthenticated,
    (loggedIn) => {
      if (loggedIn) {
        void loadAll()
        if (!intervalId) intervalId = setInterval(() => void loadAll(), 2 * 60 * 1000)
        window.addEventListener('focus', () => void loadAll())
        window.addEventListener('online', () => void loadAll())
      } else {
        clearAll()
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    },
    { immediate: true },
  )
}

export function useSync() {
  return {
    enabled: supabaseEnabled,
    syncing: computed(() => status.syncing),
    lastSyncedAt: computed(() => status.lastSyncedAt),
    error: computed(() => status.error),
    syncNow: loadAll,
  }
}
