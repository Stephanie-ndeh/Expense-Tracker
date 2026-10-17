import { reactive, computed, watch } from 'vue'
import { supabase, supabaseEnabled } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { useLedger, rowToTransaction } from './useLedger'
import { useWallets, rowToWallet } from './useWallets'
import { useCategories, rowToCategory } from './useCategories'
import { usePeople, rowToPerson } from './usePeople'
import { loadProfile, clearSettings } from './useSettings'

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
    const { replaceCategories } = useCategories()
    const { replacePeople } = usePeople()

    const [
      { data: walletRows, error: walletsError },
      { data: txRows, error: txError },
      { data: categoryRows, error: categoriesError },
      { data: peopleRows, error: peopleError },
    ] = await Promise.all([
      supabase.from('wallets').select('*').is('deleted_at', null),
      supabase.from('transactions').select('*').is('deleted_at', null),
      supabase.from('categories').select('*'),
      supabase.from('people').select('*'),
    ])
    if (walletsError) throw walletsError
    if (txError) throw txError
    if (categoriesError) throw categoriesError
    if (peopleError) throw peopleError

    await loadProfile()

    replaceWallets((walletRows ?? []).map(rowToWallet))
    replaceTransactions((txRows ?? []).map(rowToTransaction))
    replaceCategories((categoryRows ?? []).map(rowToCategory))
    replacePeople((peopleRows ?? []).map(rowToPerson))

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
  useCategories().clearCategories()
  usePeople().clearPeople()
  clearSettings()
  status.lastSyncedAt = null
  status.error = null
}

if (supabaseEnabled) {
  const { isAuthenticated } = useAuth()
  watch(
    isAuthenticated,
    (loggedIn) => {
      if (loggedIn) void loadAll()
      else clearAll()
    },
    { immediate: true },
  )
  window.addEventListener('focus', () => {
    if (isAuthenticated.value) void loadAll()
  })
  window.addEventListener('online', () => {
    if (isAuthenticated.value) void loadAll()
  })
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
