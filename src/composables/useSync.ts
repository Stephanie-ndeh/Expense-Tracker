import { reactive, computed, watch } from 'vue'
import { supabase, supabaseEnabled } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { useLedger, rowToTransaction } from './useLedger'
import { useWallets, rowToWallet } from './useWallets'
import { useCategories, rowToCategory } from './useCategories'
import { usePeople, rowToPerson } from './usePeople'
import { useTodos, rowToTodo } from './useTodos'
import { loadProfile, clearSettings } from './useSettings'
import { clearQueuedMutations } from '../lib/offlineQueue'

const status = reactive({
  syncing: false,
  lastSyncedAt: null as number | null,
  error: null as string | null,
  queueError: null as string | null,
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
    const { replaceTransactions, flushPendingTransactions } = useLedger()
    const { replaceCategories } = useCategories()
    const { replacePeople } = usePeople()
    const { replaceTodos } = useTodos()

    // Replay anything queued while offline before the fetch below, so the fresh fetch
    // reflects the now-synced rows and no pending item is lost to the upcoming replace.
    if (typeof navigator === 'undefined' || navigator.onLine) {
      const { failed } = await flushPendingTransactions()
      status.queueError = failed
        ? `${failed} queued entr${failed === 1 ? 'y' : 'ies'} failed to sync — will retry later.`
        : null
    }

    const [
      { data: walletRows, error: walletsError },
      { data: txRows, error: txError },
      { data: categoryRows, error: categoriesError },
      { data: peopleRows, error: peopleError },
      { data: todoRows, error: todosError },
    ] = await Promise.all([
      supabase.from('wallets').select('*').is('deleted_at', null),
      supabase.from('transactions').select('*').is('deleted_at', null),
      supabase.from('categories').select('*'),
      supabase.from('people').select('*'),
      supabase.from('todos').select('*').is('deleted_at', null),
    ])
    if (walletsError) throw walletsError
    if (txError) throw txError
    if (categoriesError) throw categoriesError
    if (peopleError) throw peopleError
    if (todosError) throw todosError

    await loadProfile()

    replaceWallets((walletRows ?? []).map(rowToWallet))
    replaceTransactions((txRows ?? []).map(rowToTransaction))
    replaceCategories((categoryRows ?? []).map(rowToCategory))
    replacePeople((peopleRows ?? []).map(rowToPerson))
    replaceTodos((todoRows ?? []).map(rowToTodo))

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
  useTodos().clearTodos()
  clearSettings()
  // Same reasoning as clearing every other composable's state on sign-out: an offline
  // queue left behind would otherwise get flushed under the next account signed in here.
  void clearQueuedMutations()
  status.lastSyncedAt = null
  status.error = null
  status.queueError = null
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
    queueError: computed(() => status.queueError),
    syncNow: loadAll,
  }
}
