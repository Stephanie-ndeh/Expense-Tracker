<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import type { Transaction } from '../types/transaction'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import SwipeRow from './SwipeRow.vue'

const emit = defineEmits<{ back: [] }>()
const { expensesInRange, removeTransaction } = useLedger()
const { format } = useSettings()

type RangeKey = 'week' | 'month' | 'year' | 'all'
const range = ref<RangeKey>('month')
const tabs: { value: RangeKey; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
]

const list = computed(() => expensesInRange(range.value))
const total = computed(() => list.value.reduce((s, t) => s + t.amount, 0))

const pendingDelete = ref<Transaction | null>(null)
function confirmDelete() {
  if (pendingDelete.value) removeTransaction(pendingDelete.value.id)
  pendingDelete.value = null
}

function dayLabel(date: string) {
  const d = new Date(date + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  if (fmt(d) === fmt(today)) return 'Today'
  if (fmt(d) === fmt(yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}
</script>

<template>
  <div class="min-h-screen pb-10" style="background: var(--ink); color: var(--paper)">
    <header class="flex items-center gap-3 px-5 pt-5 pb-2">
      <button @click="emit('back')" aria-label="Back" class="text-lg leading-none" style="color: var(--paper-dim)">‹</button>
      <h1 class="text-sm font-semibold">Expenses</h1>
    </header>

    <div class="px-5 pt-2">
      <div class="flex gap-2 mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="range = tab.value"
          class="flex-1 text-xs py-2 rounded-lg border"
          :style="
            range === tab.value
              ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
              : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
          "
        >
          {{ tab.label }}
        </button>
      </div>

      <p class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">
        Total {{ range === 'all' ? '' : ('this ' + range) }}
      </p>
      <p class="font-mono text-3xl font-semibold mt-1 tabular-nums" style="color: var(--money-out)">
        {{ format(total) }}
      </p>
      <p class="text-xs mt-1" style="color: var(--paper-dim)">{{ list.length }} {{ list.length === 1 ? 'entry' : 'entries' }}</p>
    </div>

    <div class="px-5 pt-6">
      <p v-if="!list.length" class="text-sm py-6 text-center" style="color: var(--paper-dim)">
        No expenses in this period.
      </p>
      <p v-else class="text-[11px] mb-1" style="color: var(--paper-dim)">Swipe left on an entry to delete it.</p>
      <SwipeRow
        v-for="t in list"
        :key="t.id"
        class="border-b"
        style="border-color: var(--ink-line)"
        @delete="pendingDelete = t"
      >
        <div class="flex items-center justify-between py-2.5">
          <div class="min-w-0">
            <p class="text-sm truncate">{{ t.label }}</p>
            <p class="text-xs" style="color: var(--paper-dim)">{{ dayLabel(t.date) }}<template v-if="t.note"> · {{ t.note }}</template></p>
          </div>
          <span class="font-mono text-sm font-medium tabular-nums shrink-0 pl-3" style="color: var(--money-out)">−{{ format(t.amount) }}</span>
        </div>
      </SwipeRow>
    </div>

    <ConfirmDeleteModal
      v-if="pendingDelete"
      :transaction="pendingDelete"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
