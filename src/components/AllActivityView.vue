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

const emit = defineEmits<{ edit: [transaction: Transaction] }>()
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
const showFilters = ref(false)

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

function resetFilters() {
  type.value = 'all'
  walletId.value = 'all'
  label.value = 'all'
  minAmountInput.value = ''
  maxAmountInput.value = ''
  applyPreset('all')
}

const dateRangeLabel = computed(() => {
  if (activePreset.value === 'week') return 'This week'
  if (activePreset.value === 'month') return new Date().toLocaleDateString(undefined, { month: 'long' })
  if (activePreset.value === 'year') return String(new Date().getFullYear())
  if (startDate.value && endDate.value) return `${startDate.value} → ${endDate.value}`
  if (startDate.value) return `From ${startDate.value}`
  return `Until ${endDate.value}`
})

const activeFilterCount = computed(() => {
  let n = 0
  if (type.value !== 'all') n++
  if (walletId.value !== 'all') n++
  if (label.value !== 'all') n++
  if (startDate.value || endDate.value) n++
  if (minAmountInput.value || maxAmountInput.value) n++
  return n
})

const chips = computed(() => {
  const list: { key: string; text: string; clear: () => void }[] = []
  if (type.value !== 'all') {
    const t = types.find((x) => x.value === type.value)
    list.push({ key: 'type', text: t?.label ?? type.value, clear: () => (type.value = 'all') })
  }
  if (walletId.value !== 'all') {
    const w = wallets.value.find((x) => x.id === walletId.value)
    list.push({ key: 'wallet', text: w?.name ?? 'Wallet', clear: () => (walletId.value = 'all') })
  }
  if (label.value !== 'all') {
    list.push({ key: 'label', text: label.value, clear: () => (label.value = 'all') })
  }
  if (startDate.value || endDate.value) {
    list.push({ key: 'date', text: dateRangeLabel.value, clear: () => applyPreset('all') })
  }
  if (minAmountInput.value || maxAmountInput.value) {
    const parts: string[] = []
    if (minAmountInput.value) parts.push(`min ${minAmountInput.value}`)
    if (maxAmountInput.value) parts.push(`max ${maxAmountInput.value}`)
    list.push({
      key: 'amount',
      text: parts.join(' · '),
      clear: () => {
        minAmountInput.value = ''
        maxAmountInput.value = ''
      },
    })
  }
  return list
})

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

const groups = computed(() => {
  const map = new Map<string, Transaction[]>()
  for (const t of list.value) {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date)!.push(t)
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    label: dayLabel(date),
    items,
    total: activityTotal(items),
  }))
})

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
</script>

<template>
  <div class="pb-10">
    <div class="px-5 flex flex-col gap-3">
      <div class="flex gap-2.5">
        <label
          class="flex-1 flex items-center gap-2.5 rounded-[14px] px-3.5 border"
          style="height: 46px; background: var(--surface); border-color: var(--line); color: var(--text-dim)"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            v-model="query"
            type="text"
            placeholder="Search entries, people, notes"
            class="flex-1 min-w-0 bg-transparent outline-none text-sm"
            style="color: var(--text)"
          />
        </label>
        <button
          type="button"
          :aria-label="`Filters, ${activeFilterCount} active`"
          class="relative shrink-0 rounded-[14px] border flex items-center justify-center"
          style="width: 46px; height: 46px; background: var(--surface); border-color: var(--line); color: var(--text)"
          @click="showFilters = true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span
            v-if="activeFilterCount"
            class="absolute flex items-center justify-center rounded-full text-[11px] font-extrabold"
            style="
              top: -5px;
              right: -5px;
              min-width: 18px;
              height: 18px;
              background: var(--accent);
              color: var(--on-accent);
            "
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>

      <div v-if="chips.length" class="flex gap-2 flex-wrap">
        <button
          v-for="c in chips"
          :key="c.key"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold border"
          style="
            height: 32px;
            background: var(--accent-surface);
            border-color: var(--accent-surface-line);
            color: var(--accent-text);
          "
          @click="c.clear"
        >
          {{ c.text }}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div class="flex justify-between items-baseline rounded-[14px] px-3.5 py-3" style="background: var(--surface)">
        <span class="text-[13px]" style="color: var(--text-dim)"
          >{{ list.length }} {{ list.length === 1 ? 'entry' : 'entries' }}</span
        >
        <span class="text-[15px] font-bold">
          Net
          <span :style="{ color: total >= 0 ? 'var(--money-in)' : 'var(--money-out)' }">
            {{ total >= 0 ? '+' : '−' }}{{ format(Math.abs(total)) }}
          </span>
        </span>
      </div>
    </div>

    <div class="px-5 pt-3">
      <p v-if="!list.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
        No activity matches these filters.
      </p>

      <div v-for="g in groups" :key="g.date">
        <div
          class="flex justify-between py-1.5 text-xs font-bold"
          style="color: var(--text-dim); letter-spacing: 0.3px"
        >
          <span>{{ g.label }}</span>
          <span :style="{ color: g.total >= 0 ? 'var(--money-in)' : 'var(--money-out)' }">
            {{ g.total >= 0 ? '+' : '−' }}{{ format(Math.abs(g.total)) }}
          </span>
        </div>
        <SwipeRow
          v-for="t in g.items"
          :key="t.id"
          class="border-t"
          style="border-color: var(--line)"
          @edit="emit('edit', t)"
          @delete="pendingDelete = t"
        >
          <div class="flex items-center gap-3 py-2.5">
            <span
              class="rounded-xl flex items-center justify-center shrink-0 font-bold"
              style="width: 38px; height: 38px; background: var(--surface); color: var(--accent-text); font-size: 14px"
            >
              {{ t.label.charAt(0).toUpperCase() }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ t.label }}</p>
              <p class="text-xs" style="color: var(--text-dim)">
                {{ TYPE_META[t.type].verb }}<template v-if="t.note"> · {{ t.note }}</template
                ><template v-if="t.pendingSync">
                  · <span style="color: var(--accent-text)">Pending sync</span></template
                >
              </p>
            </div>
            <span
              class="text-sm font-bold shrink-0 pl-3"
              :style="{ color: TYPE_META[t.type].sign > 0 ? 'var(--money-in)' : 'var(--money-out)' }"
            >
              {{ TYPE_META[t.type].sign > 0 ? '+' : '−' }}{{ format(t.amount) }}
            </span>
          </div>
        </SwipeRow>
      </div>

      <p v-if="list.length" class="text-[11px] mt-3" style="color: var(--text-dim)">
        Swipe left to delete · swipe right to edit.
      </p>
    </div>

    <ConfirmDeleteModal
      v-if="pendingDelete"
      :transaction="pendingDelete"
      :error="deleteError"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />

    <div v-if="showFilters" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div class="absolute inset-0 bg-black/60" @click="showFilters = false" />
      <div
        class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto"
        style="background: var(--surface)"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Filters</h2>
          <button type="button" class="text-sm" style="color: var(--text-dim)" @click="showFilters = false">
            Done
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <select
            v-model="type"
            class="rounded-lg px-3 py-2 text-sm outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          >
            <option value="all">All types</option>
            <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>

          <select
            v-model="walletId"
            class="rounded-lg px-3 py-2 text-sm outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          >
            <option value="all">All wallets</option>
            <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>

          <select
            v-model="label"
            class="rounded-lg px-3 py-2 text-sm outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
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
              class="rounded-lg px-3 py-2 text-sm outline-none border"
              style="background: var(--bg); border-color: var(--line); color: var(--text)"
            />
            <input
              v-model="maxAmountInput"
              type="number"
              inputmode="decimal"
              min="0"
              placeholder="Max amount"
              class="rounded-lg px-3 py-2 text-sm outline-none border"
              style="background: var(--bg); border-color: var(--line); color: var(--text)"
            />
          </div>

          <div class="flex gap-2">
            <button
              v-for="p in presets"
              :key="p.value"
              type="button"
              class="flex-1 text-xs py-2 rounded-lg border"
              :style="
                activePreset === p.value
                  ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                  : { borderColor: 'var(--line)', color: 'var(--text-dim)' }
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
              style="background: var(--bg); border-color: var(--line); color: var(--text)"
            />
            <input
              v-model="endDate"
              type="date"
              class="rounded-lg px-3 py-2 text-xs outline-none border"
              style="background: var(--bg); border-color: var(--line); color: var(--text)"
            />
          </div>

          <button
            type="button"
            class="text-xs font-semibold self-start"
            style="color: var(--accent-text)"
            @click="resetFilters"
          >
            Clear all filters
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
