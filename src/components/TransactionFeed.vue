<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { TYPE_META } from '../types/transaction'
import type { Transaction } from '../types/transaction'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import SwipeRow from './SwipeRow.vue'

const emit = defineEmits<{ edit: [transaction: Transaction] }>()
const { upcoming, removeTransaction, markSettled } = useLedger()
const { format } = useSettings()

const pendingDelete = ref<Transaction | null>(null)
const deleteError = ref('')
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

const settleError = ref('')
async function handleMarkSettled(id: string) {
  settleError.value = ''
  try {
    await markSettled(id)
  } catch (e) {
    settleError.value = e instanceof Error ? e.message : 'Could not update this entry.'
  }
}

function cancelDelete() {
  pendingDelete.value = null
  deleteError.value = ''
}
</script>

<template>
  <div v-if="upcoming.length" class="px-5 pt-6 pb-2">
    <h3 class="text-xs uppercase tracking-wide mb-2" style="color: var(--text-dim)">Coming up</h3>
    <p v-if="settleError" class="text-xs mb-2" style="color: var(--warn-text)">{{ settleError }}</p>
    <p class="text-[11px] mb-1" style="color: var(--text-dim)">Swipe left to delete · swipe right to edit.</p>
    <SwipeRow
      v-for="t in upcoming"
      :key="t.id"
      class="border-b border-dashed"
      style="border-color: var(--line)"
      @edit="emit('edit', t)"
      @delete="pendingDelete = t"
    >
      <div class="flex items-center justify-between py-2.5">
        <div class="min-w-0">
          <p class="text-sm truncate">{{ t.label }}</p>
          <p class="text-xs" style="color: var(--text-dim)">
            {{ t.date }} · {{ TYPE_META[t.type].verb
            }}<template v-if="t.pendingSync"> · <span style="color: var(--accent-text)">Pending sync</span></template>
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="text-sm tabular-nums" style="color: var(--text-dim)">{{ format(t.amount) }}</span>
          <button
            class="text-xs px-2 py-1 rounded-md"
            style="background: var(--surface); color: var(--accent-text)"
            @click="handleMarkSettled(t.id)"
          >
            Mark done
          </button>
        </div>
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
