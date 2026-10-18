<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { TYPE_META } from '../types/transaction'
import type { Transaction } from '../types/transaction'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import SwipeRow from './SwipeRow.vue'

const emit = defineEmits<{ seeAll: []; edit: [transaction: Transaction] }>()
const { recentActivity, pastTransactions, removeTransaction } = useLedger()
const { format } = useSettings()

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
  <div class="px-5 pt-6 pb-2">
    <div class="flex items-baseline justify-between mb-1">
      <h3 class="text-base font-bold">Recent</h3>
      <button
        v-if="pastTransactions.length > 4"
        class="text-xs font-bold"
        style="color: var(--accent-text)"
        @click="emit('seeAll')"
      >
        See all
      </button>
    </div>

    <p v-if="!recentActivity.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
      No activity logged yet.
    </p>
    <p v-else class="text-[11px] mb-1" style="color: var(--text-dim)">Swipe left to delete · swipe right to edit.</p>

    <SwipeRow
      v-for="t in recentActivity"
      :key="t.id"
      class="border-b"
      style="border-color: var(--line)"
      @edit="emit('edit', t)"
      @delete="pendingDelete = t"
    >
      <div class="flex items-center justify-between py-2.5">
        <div class="min-w-0">
          <p class="text-sm truncate">{{ t.label }}</p>
          <p class="text-xs" style="color: var(--text-dim)">
            {{ dayLabel(t.date) }} · {{ TYPE_META[t.type].verb }}<template v-if="t.note"> · {{ t.note }}</template
            ><template v-if="t.pendingSync"> · <span style="color: var(--accent-text)">Pending sync</span></template>
          </p>
        </div>
        <span
          class="text-sm font-medium tabular-nums shrink-0 pl-3"
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
</template>
