import { computed, reactive } from 'vue'
import type { Transaction, TransactionType } from '../types/transaction'
import { TYPE_META } from '../types/transaction'
import type { Wallet } from '../types/wallet'
import { useWallets } from './useWallets'
import { supabase } from '../lib/supabaseClient'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const today = () => new Date().toISOString().slice(0, 10)

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
}

export function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    walletId: r.wallet_id,
    type: r.type as TransactionType,
    amount: Number(r.amount),
    date: r.date,
    note: r.note,
    label: r.label,
    planned: r.planned,
    createdAt: Number(r.created_at),
  }
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

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

const state = reactive({
  transactions: [] as Transaction[],
})

export function useLedger() {
  const { activeWalletId, wallets, importWallets } = useWallets()

  const scopedTransactions = computed(() =>
    activeWalletId.value === 'all'
      ? state.transactions
      : state.transactions.filter((t) => t.walletId === activeWalletId.value),
  )

  const transactions = computed(() =>
    [...scopedTransactions.value].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
  )

  const settled = computed(() => scopedTransactions.value.filter((t) => !t.planned && t.date <= today()))
  const upcoming = computed(() =>
    [...scopedTransactions.value]
      .filter((t) => t.planned || t.date > today())
      .sort((a, b) => (a.date > b.date ? 1 : -1)),
  )

  function signedAmount(t: Transaction) {
    return TYPE_META[t.type].sign * t.amount
  }

  const balance = computed(() =>
    settled.value
      .filter((t) => TYPE_META[t.type].group === 'cash')
      .reduce((sum, t) => sum + signedAmount(t), 0) -
    settled.value
      .filter((t) => TYPE_META[t.type].group === 'savings')
      .reduce((sum, t) => sum + signedAmount(t), 0) +
    settled.value
      .filter((t) => TYPE_META[t.type].group === 'lending')
      .reduce((sum, t) => sum + signedAmount(t), 0),
  )

  const savings = computed(() =>
    settled.value
      .filter((t) => TYPE_META[t.type].group === 'savings')
      .reduce((sum, t) => sum + signedAmount(t), 0),
  )

  const owedToYou = computed(() => {
    const perPerson = new Map<string, number>()
    for (const t of settled.value) {
      if (t.type === 'lend') perPerson.set(t.label, (perPerson.get(t.label) ?? 0) + t.amount)
      if (t.type === 'repay') perPerson.set(t.label, (perPerson.get(t.label) ?? 0) - t.amount)
    }
    return perPerson
  })

  const totalOwedToYou = computed(() =>
    Array.from(owedToYou.value.values()).reduce((s, v) => s + Math.max(v, 0), 0),
  )

  const plannedSpend = computed(() =>
    upcoming.value.filter((t) => t.type === 'expense' || t.type === 'lend').reduce((s, t) => s + t.amount, 0),
  )

  const thisMonthSpend = computed(() => {
    const ym = today().slice(0, 7)
    return settled.value
      .filter((t) => t.type === 'expense' && t.date.slice(0, 7) === ym)
      .reduce((s, t) => s + t.amount, 0)
  })

  async function addTransaction(input: {
    type: TransactionType
    amount: number
    date: string
    note: string
    label: string
    planned: boolean
    walletId: string
  }) {
    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const t: Transaction = { id: uid(), createdAt: Date.now(), ...input }
    const { error } = await supabase.from('transactions').insert(transactionToRow(t, userId))
    if (error) throw error
    state.transactions.push(t)
  }

  async function removeTransaction(id: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    const idx = state.transactions.findIndex((t) => t.id === id)
    if (idx !== -1) state.transactions.splice(idx, 1)
  }

  async function markSettled(id: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.from('transactions').update({ planned: false }).eq('id', id)
    if (error) throw error
    const t = state.transactions.find((t) => t.id === id)
    if (t) t.planned = false
  }

  // --- Per-person lending view ---
  const personSummaries = computed(() => {
    const byPerson = new Map<string, Transaction[]>()
    for (const t of scopedTransactions.value) {
      if (t.type !== 'lend' && t.type !== 'repay') continue
      const list = byPerson.get(t.label) ?? []
      list.push(t)
      byPerson.set(t.label, list)
    }
    return Array.from(byPerson.entries())
      .map(([name, list]) => {
        const settledList = list.filter((t) => !t.planned)
        const lent = settledList.filter((t) => t.type === 'lend').reduce((s, t) => s + t.amount, 0)
        const repaid = settledList.filter((t) => t.type === 'repay').reduce((s, t) => s + t.amount, 0)
        return {
          name,
          lent,
          repaid,
          netOwed: lent - repaid,
          transactions: [...list].sort((a, b) => (a.date < b.date ? 1 : -1)),
        }
      })
      .sort((a, b) => b.netOwed - a.netOwed)
  })

  // --- Monthly trend (last N months, income vs expense) ---
  function monthlyTrend(months = 6) {
    const now = new Date()
    const buckets: { month: string; label: string; income: number; expense: number }[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets.push({ month: key, label: d.toLocaleDateString(undefined, { month: 'short' }), income: 0, expense: 0 })
    }
    const byKey = new Map(buckets.map((b) => [b.month, b]))
    for (const t of settled.value) {
      const key = t.date.slice(0, 7)
      const bucket = byKey.get(key)
      if (!bucket) continue
      if (t.type === 'income') bucket.income += t.amount
      if (t.type === 'expense') bucket.expense += t.amount
    }
    return buckets
  }

  const pastTransactions = computed(() => transactions.value.filter((t) => !t.planned && t.date <= today()))

  // --- Recent activity: top few for home, full history for the dedicated view ---
  const recentActivity = computed(() => pastTransactions.value.slice(0, 5))

  type RangeKey = 'week' | 'month' | 'year' | 'all'
  type KindKey = 'all' | 'spent' | 'received'
  function activityInRange(range: RangeKey, kind: KindKey = 'all') {
    const now = new Date()
    return pastTransactions.value.filter((t) => {
      if (kind === 'spent' && TYPE_META[t.type].sign > 0) return false
      if (kind === 'received' && TYPE_META[t.type].sign < 0) return false
      if (range === 'all') return true
      if (range === 'year') return t.date.slice(0, 4) === String(now.getFullYear())
      if (range === 'month') return t.date.slice(0, 7) === today().slice(0, 7)
      const d = new Date(t.date + 'T00:00:00')
      const diffDays = (now.getTime() - d.getTime()) / 86400000
      return diffDays >= 0 && diffDays < 7
    })
  }

  // --- Month-over-month comparison ---
  function monthKey(offset = 0) {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  function monthName(offset = 0) {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }

  const monthComparison = computed(() => {
    const curKey = monthKey(0)
    const prevKey = monthKey(-1)
    const sumFor = (key: string, type: TransactionType) =>
      settled.value.filter((t) => t.type === type && t.date.slice(0, 7) === key).reduce((s, t) => s + t.amount, 0)
    return {
      currentLabel: monthName(0),
      previousLabel: monthName(-1),
      expense: { current: sumFor(curKey, 'expense'), previous: sumFor(prevKey, 'expense') },
      income: { current: sumFor(curKey, 'income'), previous: sumFor(prevKey, 'income') },
      lent: { current: sumFor(curKey, 'lend'), previous: sumFor(prevKey, 'lend') },
      saved: { current: sumFor(curKey, 'save'), previous: sumFor(prevKey, 'save') },
    }
  })

  function categoryBreakdown(offset = 0) {
    const key = monthKey(offset)
    const map = new Map<string, number>()
    for (const t of settled.value) {
      if (t.type !== 'expense' || t.date.slice(0, 7) !== key) continue
      const k = t.label.trim() || 'Other'
      map.set(k, (map.get(k) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
  }

  const categoryComparison = computed(() => {
    const cur = categoryBreakdown(0)
    const prev = categoryBreakdown(-1)
    const prevMap = new Map(prev.map((c) => [c.label, c.amount]))
    const seen = new Set<string>()
    const rows = cur.map((c) => {
      seen.add(c.label)
      return { label: c.label, current: c.amount, previous: prevMap.get(c.label) ?? 0 }
    })
    for (const p of prev) {
      if (!seen.has(p.label)) rows.push({ label: p.label, current: 0, previous: p.amount })
    }
    return rows.sort((a, b) => b.current - a.current)
  })

  function exportData() {
    return JSON.stringify(
      { exportedAt: new Date().toISOString(), transactions: state.transactions, wallets: wallets.value },
      null,
      2,
    )
  }

  async function importData(json: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const parsed = JSON.parse(json)
    const incoming: Transaction[] = Array.isArray(parsed) ? parsed : parsed.transactions
    if (!Array.isArray(incoming)) throw new Error('Invalid file format')
    const incomingWallets: Wallet[] = Array.isArray(parsed?.wallets) ? parsed.wallets : []

    if (incomingWallets.length) await importWallets(incomingWallets)

    const existingIds = new Set(state.transactions.map((t) => t.id))
    let failures = 0
    for (const t of incoming) {
      if (existingIds.has(t.id)) continue
      const { error } = await supabase.from('transactions').insert(transactionToRow(t, userId))
      if (error) {
        failures++
        continue
      }
      state.transactions.push(t)
      existingIds.add(t.id)
    }
    if (failures) throw new Error(`Imported with ${failures} entr${failures === 1 ? 'y' : 'ies'} skipped.`)
  }

  /** Authoritative overwrite from Supabase — the server is the only source of truth, so no merge. */
  function replaceTransactions(items: Transaction[]) {
    state.transactions = items
  }

  function clearTransactions() {
    state.transactions = []
  }

  return {
    transactions,
    upcoming,
    balance,
    savings,
    owedToYou,
    totalOwedToYou,
    plannedSpend,
    thisMonthSpend,
    addTransaction,
    removeTransaction,
    markSettled,
    personSummaries,
    monthlyTrend,
    pastTransactions,
    recentActivity,
    activityInRange,
    monthComparison,
    categoryComparison,
    exportData,
    importData,
    replaceTransactions,
    clearTransactions,
  }
}
