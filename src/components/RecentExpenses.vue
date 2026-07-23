<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import type { Transaction } from '../types/transaction'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import SwipeRow from './SwipeRow.vue'

const emit = defineEmits<{ seeAll: [] }>()
const { recentExpenses, expenseHistory, removeTransaction } = useLedger()
const { format } = useSettings()

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
  <div class="px-5 pt-6 pb-2">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Recent expenses</h3>
      <button v-if="expenseHistory.length > 10" @click="emit('seeAll')" class="text-xs" style="color: var(--accent)">
        See all ({{ expenseHistory.length }}) ›
      </button>
    </div>

    <p v-if="!recentExpenses.length" class="text-sm py-6 text-center" style="color: var(--paper-dim)">
      No expenses logged yet.
    </p>
    <p v-else class="text-[11px] mb-1" style="color: var(--paper-dim)">Swipe left on an entry to delete it.</p>

    <SwipeRow
      v-for="t in recentExpenses"
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
        <span class="font-mono text-sm font-medium tabular-nums shrink-0 pl-3" style="color: var(--money-out)">
          −{{ format(t.amount) }}
        </span>
      </div>
    </SwipeRow>
  </div>

  <ConfirmDeleteModal
    v-if="pendingDelete"
    :transaction="pendingDelete"
    @cancel="pendingDelete = null"
    @confirm="confirmDelete"
  />
</template>
