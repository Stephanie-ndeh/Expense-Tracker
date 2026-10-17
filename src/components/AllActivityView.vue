<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'
import { useCategories } from '../composables/useCategories'
import { usePeople } from '../composables/usePeople'
import { TYPE_META } from '../types/transaction'
import type { Transaction, TransactionType } from '../types/transaction'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import SwipeRow from './SwipeRow.vue'

const emit = defineEmits<{ back: []; edit: [transaction: Transaction] }>()
const { filterActivity, activityTotal, removeTransaction } = useLedger()
const { format } = useSettings()
const { wallets } = useWallets()
const { categories } = useCategories()
const { people } = usePeople()

const types: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Received' },
  { value: 'lend', label: 'Lent out' },
  { value: 'repay', label: 'Paid back' },
  { value: 'save', label: 'Saved' },
  { value: 'withdraw', label: 'From savings' },
  { value: 'transfer_out', label: 'Transferred out' },
  { value: 'transfer_in', label: 'Transferred in' },
  { value: 'borrow', label: 'Borrowed' },
  { value: 'payback', label: 'Repaid' },
]

const labelOptions = computed(() => {
  const names = new Set<string>()
  for (const c of categories.value) names.add(c.name)
  for (const p of people.value) names.add(p.name)
  return Array.from(names).sort((a, b) => a.localeCompare(b))
})

const query = ref('')
const type = ref<TransactionType | 'all'>('all')
const walletId = ref<string>('all')
const label = ref<string>('all')
const minAmountInput = ref('')
const maxAmountInput = ref('')
const startDate = ref<string | null>(null)
const endDate = ref<string | null>(null)

type Preset = 'week' | 'month' | 'year' | 'all'
const presets: { value: Preset; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function presetRange(preset: Preset): { start: string | null; end: string | null } {
  if (preset === 'all') return { start: null, end: null }
  const now = new Date()
  const end = todayStr()
  if (preset === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { start: d.toISOString().slice(0, 10), end }
  }
  if (preset === 'month') {
    return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end }
  }
  return { start: `${now.getFullYear()}-01-01`, end }
}

function applyPreset(preset: Preset) {
  const r = presetRange(preset)
  startDate.value = r.start
  endDate.value = r.end
}
applyPreset('month')

const activePreset = computed(
  () =>
    presets.find((p) => {
      const r = presetRange(p.value)
      return r.start === startDate.value && r.end === endDate.value
    })?.value ?? null,
)

const list = computed(() =>
  filterActivity({
    query: query.value,
    type: type.value,
    walletId: walletId.value,
    label: label.value,
    minAmount: minAmountInput.value ? parseFloat(minAmountInput.value) : null,
    maxAmount: maxAmountInput.value ? parseFloat(maxAmountInput.value) : null,
    startDate: startDate.value,
    endDate: endDate.value,
  }),
)

const total = computed(() => activityTotal(list.value))

const pendingDelete = ref<Transaction | null>(null)
const deleteError = ref('')
function cancelDelete() {
  pendingDelete.value = null
  deleteError.value = ''
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  deleteError.value = ''
  try {
    await removeTransaction(id)
    pendingDelete.value = null
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Could not delete this entry.'
  }
}

function dayLabel(date: string) {
  const d = new Date(date + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  if (fmt(d) === fmt(today)) return 'Today'
  if (fmt(d) === fmt(yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}
</script>

<template>
  <div class="min-h-screen pb-10" style="background: var(--ink); color: var(--paper)">
    <header class="flex items-center gap-3 px-5 pt-5 pb-2">
      <button aria-label="Back" class="text-lg leading-none" style="color: var(--paper-dim)" @click="emit('back')">
        ‹
      </button>
      <h1 class="text-sm font-semibold">All activity</h1>
    </header>

    <div class="px-5 pt-2 space-y-3">
      <input
        v-model="query"
        type="text"
        placeholder="Search label or note"
        class="w-full rounded-lg px-3 py-2 text-sm outline-none border"
        style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
      />

      <div class="grid grid-cols-2 gap-2">
        <select
          v-model="type"
          class="rounded-lg px-3 py-2 text-xs outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        >
          <option value="all">All types</option>
          <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>

        <select
          v-model="walletId"
          class="rounded-lg px-3 py-2 text-xs outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        >
          <option value="all">All wallets</option>
          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </div>

      <select
        v-model="label"
        class="w-full rounded-lg px-3 py-2 text-xs outline-none border"
        style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
      >
        <option value="all">All categories / people</option>
        <option v-for="l in labelOptions" :key="l" :value="l">{{ l }}</option>
      </select>

      <div class="grid grid-cols-2 gap-2">
        <input
          v-model="minAmountInput"
          type="number"
          inputmode="decimal"
          min="0"
          placeholder="Min amount"
          class="rounded-lg px-3 py-2 text-xs outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
        <input
          v-model="maxAmountInput"
          type="number"
          inputmode="decimal"
          min="0"
          placeholder="Max amount"
          class="rounded-lg px-3 py-2 text-xs outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </div>

      <div class="flex gap-2">
        <button
          v-for="p in presets"
          :key="p.value"
          class="flex-1 text-xs py-2 rounded-lg border"
          :style="
            activePreset === p.value
              ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
              : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
          "
          @click="applyPreset(p.value)"
        >
          {{ p.label }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <input
          v-model="startDate"
          type="date"
          class="rounded-lg px-3 py-2 text-xs outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
        <input
          v-model="endDate"
          type="date"
          class="rounded-lg px-3 py-2 text-xs outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </div>

      <p class="text-xs" style="color: var(--paper-dim)">
        {{ list.length }} {{ list.length === 1 ? 'entry' : 'entries' }} · net
        <span class="font-mono" :style="{ color: total >= 0 ? 'var(--money-in)' : 'var(--money-out)' }">
          {{ total >= 0 ? '+' : '−' }}{{ format(Math.abs(total)) }}
        </span>
      </p>
    </div>

    <div class="px-5 pt-4">
      <p v-if="!list.length" class="text-sm py-6 text-center" style="color: var(--paper-dim)">
        No activity matches these filters.
      </p>
      <p v-else class="text-[11px] mb-1" style="color: var(--paper-dim)">Swipe left to delete · swipe right to edit.</p>
      <SwipeRow
        v-for="t in list"
        :key="t.id"
        class="border-b"
        style="border-color: var(--ink-line)"
        @edit="emit('edit', t)"
        @delete="pendingDelete = t"
      >
        <div class="flex items-center justify-between py-2.5">
          <div class="min-w-0">
            <p class="text-sm truncate">{{ t.label }}</p>
            <p class="text-xs" style="color: var(--paper-dim)">
              {{ dayLabel(t.date) }} · {{ TYPE_META[t.type].verb }}<template v-if="t.note"> · {{ t.note }}</template
              ><template v-if="t.pendingSync"> · <span style="color: var(--accent)">Pending sync</span></template>
            </p>
          </div>
          <span
            class="font-mono text-sm font-medium tabular-nums shrink-0 pl-3"
            :style="{ color: TYPE_META[t.type].sign > 0 ? 'var(--money-in)' : 'var(--money-out)' }"
          >
            {{ TYPE_META[t.type].sign > 0 ? '+' : '−' }}{{ format(t.amount) }}
          </span>
        </div>
      </SwipeRow>
    </div>

    <ConfirmDeleteModal
      v-if="pendingDelete"
      :transaction="pendingDelete"
      :error="deleteError"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </div>
</template>
