import { reactive, computed, watch } from 'vue'
import type { Transaction } from '../types/transaction'
import type { Wallet } from '../types/wallet'
import { supabase, supabaseEnabled } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { onLedgerMutation, useLedger } from './useLedger'
import { onWalletMutation, useWallets } from './useWallets'

type TransactionRow = {
  id: string
  wallet_id: string
  type: string
  amount: number | string
  date: string
  note: string
  label: string
  planned: boolean
  created_at: number | string
  deleted_at: string | null
}

type WalletRow = {
  id: string
  name: string
  created_at: number | string
  deleted_at: string | null
}

function transactionToRow(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    wallet_id: t.walletId,
    type: t.type,
    amount: t.amount,
    date: t.date,
    note: t.note,
    label: t.label,
    planned: t.planned,
    created_at: t.createdAt,
  }
}

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    walletId: r.wallet_id,
    type: r.type as Transaction['type'],
    amount: Number(r.amount),
    date: r.date,
    note: r.note,
    label: r.label,
    planned: r.planned,
    createdAt: Number(r.created_at),
  }
}

function walletToRow(w: Wallet, userId: string) {
  return { id: w.id, user_id: userId, name: w.name, created_at: w.createdAt }
}

function rowToWallet(r: WalletRow): Wallet {
  return { id: r.id, name: r.name, createdAt: Number(r.created_at) }
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

async function pushWallet(w: Wallet) {
  if (!supabase) return
  const userId = await getUserId()
  if (!userId) return
  await supabase.from('wallets').upsert(walletToRow(w, userId))
}

async function pushTransaction(t: Transaction) {
  if (!supabase) return
  const userId = await getUserId()
  if (!userId) return
  await supabase.from('transactions').upsert(transactionToRow(t, userId))
}

async function pushTransactionDelete(id: string) {
  if (!supabase) return
  await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

// Registered once at module load — independent of how many components call useSync().
if (supabase) {
  onLedgerMutation((e) => {
    if (e.kind === 'upsert') void pushTransaction(e.transaction)
    else void pushTransactionDelete(e.id)
  })
  onWalletMutation((w) => {
    void pushWallet(w)
  })
}

const status = reactive({
  syncing: false,
  lastSyncedAt: null as number | null,
  error: null as string | null,
})

async function syncNow() {
  if (!supabase) return
  status.syncing = true
  status.error = null
  try {
    const userId = await getUserId()
    if (!userId) return

    const [{ data: remoteWallets, error: walletsError }, { data: remoteTx, error: txError }] = await Promise.all([
      supabase.from('wallets').select('*'),
      supabase.from('transactions').select('*'),
    ])
    if (walletsError) throw walletsError
    if (txError) throw txError

    const walletRows = (remoteWallets ?? []) as WalletRow[]
    const txRows = (remoteTx ?? []) as TransactionRow[]

    const { applyRemoteWallets, wallets } = useWallets()
    applyRemoteWallets(
      walletRows.filter((r) => !r.deleted_at).map(rowToWallet),
      walletRows.filter((r) => r.deleted_at).map((r) => r.id),
    )

    const { applyRemoteTransactions, rawTransactions } = useLedger()
    applyRemoteTransactions(
      txRows.filter((r) => !r.deleted_at).map(rowToTransaction),
      txRows.filter((r) => r.deleted_at).map((r) => r.id),
    )

    // Push anything that exists locally but never made it to Supabase (e.g. entries made before signing in).
    const remoteWalletIds = new Set(walletRows.map((r) => r.id))
    for (const w of wallets.value) {
      if (!remoteWalletIds.has(w.id)) await pushWallet(w)
    }
    const remoteTxIds = new Set(txRows.map((r) => r.id))
    for (const t of rawTransactions.value) {
      if (!remoteTxIds.has(t.id)) await pushTransaction(t)
    }

    status.lastSyncedAt = Date.now()
  } catch (err) {
    status.error = err instanceof Error ? err.message : 'Sync failed'
  } finally {
    status.syncing = false
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

if (supabaseEnabled) {
  const { isAuthenticated } = useAuth()
  watch(
    isAuthenticated,
    (loggedIn) => {
      if (loggedIn) {
        void syncNow()
        if (!intervalId) intervalId = setInterval(() => void syncNow(), 2 * 60 * 1000)
        window.addEventListener('focus', () => void syncNow())
        window.addEventListener('online', () => void syncNow())
      } else if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
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
    syncNow,
  }
}
