<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { TYPE_META } from '../types/transaction'
import type { Transaction } from '../types/transaction'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

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
</script>

<template>
  <div v-if="upcoming.length" class="px-5 pt-6 pb-2">
    <h3 class="text-xs uppercase tracking-wide mb-2" style="color: var(--paper-dim)">Coming up</h3>
    <p v-if="settleError" class="text-xs mb-2" style="color: var(--money-out)">{{ settleError }}</p>
    <div
      v-for="t in upcoming"
      :key="t.id"
      class="flex items-center justify-between py-2.5 border-b border-dashed"
      style="border-color: var(--ink-line)"
    >
      <div class="min-w-0">
        <p class="text-sm truncate">{{ t.label }}</p>
        <p class="text-xs" style="color: var(--paper-dim)">{{ t.date }} · {{ TYPE_META[t.type].verb }}</p>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <span class="font-mono text-sm tabular-nums" style="color: var(--paper-dim)">{{ format(t.amount) }}</span>
        <button @click="handleMarkSettled(t.id)" class="text-xs px-2 py-1 rounded-md" style="background: var(--ink-raised); color: var(--accent)">Mark done</button>
        <button @click="pendingDelete = t" class="text-xs" style="color: var(--paper-dim)">✕</button>
      </div>
    </div>
  </div>

  <ConfirmDeleteModal
    v-if="pendingDelete"
    :transaction="pendingDelete"
    :error="deleteError"
    @cancel="pendingDelete = null; deleteError = ''"
    @confirm="confirmDelete"
  />
</template>
