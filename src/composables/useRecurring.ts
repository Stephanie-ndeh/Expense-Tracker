import { computed, reactive } from 'vue'
import type { RecurringRule, RecurringFrequency } from '../types/recurring'
import type { Transaction, TransactionType } from '../types/transaction'
import { supabase } from '../lib/supabaseClient'
import { useLedger } from './useLedger'

function uid() {
  return crypto.randomUUID()
}

const today = () => new Date().toISOString().slice(0, 10)

export type RecurringRuleRow = {
  id: string
  wallet_id: string
  type: string
  amount: number | string
  note: string
  label: string
  category_id: string | null
  person_id: string | null
  frequency: string
  start_date: string
  end_date: string | null
  last_generated_date: string | null
  paused: boolean
  created_at: string
}

export function rowToRule(r: RecurringRuleRow): RecurringRule {
  return {
    id: r.id,
    walletId: r.wallet_id,
    type: r.type as TransactionType,
    amount: Number(r.amount),
    note: r.note,
    label: r.label,
    categoryId: r.category_id,
    personId: r.person_id,
    frequency: r.frequency as RecurringFrequency,
    startDate: r.start_date,
    endDate: r.end_date,
    lastGeneratedDate: r.last_generated_date,
    paused: r.paused,
    createdAt: new Date(r.created_at).getTime(),
  }
}

function ruleToRow(r: RecurringRule, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    wallet_id: r.walletId,
    type: r.type,
    amount: r.amount,
    note: r.note,
    label: r.label,
    category_id: r.categoryId,
    person_id: r.personId,
    frequency: r.frequency,
    start_date: r.startDate,
    end_date: r.endDate,
    last_generated_date: r.lastGeneratedDate,
    paused: r.paused,
    created_at: new Date(r.createdAt).toISOString(),
  }
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

const state = reactive({
  rules: [] as RecurringRule[],
})

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
}

/** Advances a date one interval, clamping month/year overflow (e.g. the 31st on a 30-day month). */
function stepDate(dateStr: string, frequency: RecurringFrequency): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (frequency === 'weekly') {
    return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10)
  }
  if (frequency === 'monthly') {
    const clampedDay = Math.min(d, daysInMonth(y, m))
    return new Date(Date.UTC(y, m, clampedDay)).toISOString().slice(0, 10)
  }
  const clampedDay = Math.min(d, daysInMonth(y + 1, m - 1))
  return new Date(Date.UTC(y + 1, m - 1, clampedDay)).toISOString().slice(0, 10)
}

/** Dates due between (lastGeneratedDate ?? startDate) and upToDate, inclusive, capped by endDate. */
function occurrencesDue(rule: RecurringRule, upToDate: string): string[] {
  const dates: string[] = []
  let cursor = rule.lastGeneratedDate ? stepDate(rule.lastGeneratedDate, rule.frequency) : rule.startDate
  let guard = 0
  while (cursor <= upToDate && (!rule.endDate || cursor <= rule.endDate) && guard < 1000) {
    dates.push(cursor)
    cursor = stepDate(cursor, rule.frequency)
    guard++
  }
  return dates
}

export function useRecurring() {
  const { addGeneratedTransactions } = useLedger()
  const rules = computed(() => state.rules)

  async function addRule(input: {
    walletId: string
    type: TransactionType
    amount: number
    note: string
    label: string
    categoryId: string | null
    personId: string | null
    frequency: RecurringFrequency
    startDate: string
    endDate: string | null
  }) {
    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const rule: RecurringRule = {
      id: uid(),
      ...input,
      lastGeneratedDate: null,
      paused: false,
      createdAt: Date.now(),
    }
    const { error } = await supabase.from('recurring_rules').insert(ruleToRow(rule, userId))
    if (error) throw error
    state.rules.push(rule)
    await generateDueOccurrences()
  }

  async function setPaused(id: string, paused: boolean) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.from('recurring_rules').update({ paused }).eq('id', id)
    if (error) throw error
    const rule = state.rules.find((r) => r.id === id)
    if (rule) rule.paused = paused
  }

  async function removeRule(id: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase
      .from('recurring_rules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    const idx = state.rules.findIndex((r) => r.id === id)
    if (idx !== -1) state.rules.splice(idx, 1)
  }

  /** Idempotent: bulk-generates everything due up to today for every active rule, then advances last_generated_date. */
  async function generateDueOccurrences() {
    if (!supabase) return

    const todayStr = today()
    const toInsert: Transaction[] = []
    const ruleUpdates: { id: string; lastGeneratedDate: string }[] = []

    for (const rule of state.rules) {
      if (rule.paused) continue
      const due = occurrencesDue(rule, todayStr)
      if (!due.length) continue
      for (const date of due) {
        toInsert.push({
          id: uid(),
          walletId: rule.walletId,
          type: rule.type,
          amount: rule.amount,
          date,
          note: rule.note,
          label: rule.label,
          categoryId: rule.categoryId,
          personId: rule.personId,
          transferId: null,
          planned: false,
          createdAt: Date.now(),
        })
      }
      ruleUpdates.push({ id: rule.id, lastGeneratedDate: due[due.length - 1] })
    }

    if (!toInsert.length) return

    await addGeneratedTransactions(toInsert)

    for (const u of ruleUpdates) {
      const { error } = await supabase
        .from('recurring_rules')
        .update({ last_generated_date: u.lastGeneratedDate })
        .eq('id', u.id)
      if (error) throw error
      const rule = state.rules.find((r) => r.id === u.id)
      if (rule) rule.lastGeneratedDate = u.lastGeneratedDate
    }
  }

  /** Authoritative overwrite from Supabase — the server is the only source of truth, so no merge. */
  function replaceRules(items: RecurringRule[]) {
    state.rules = items
  }

  function clearRules() {
    state.rules = []
  }

  return {
    rules,
    addRule,
    setPaused,
    removeRule,
    generateDueOccurrences,
    replaceRules,
    clearRules,
  }
}
