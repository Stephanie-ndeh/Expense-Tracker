<script setup lang="ts">
import { useSettings } from '../composables/useSettings'
import type { Transaction } from '../types/transaction'

defineProps<{ transaction: Transaction }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { format } = useSettings()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-6">
    <div class="absolute inset-0 bg-black/60" @click="emit('cancel')" />
    <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--ink-raised)">
      <h2 class="text-sm font-semibold mb-1">Delete this entry?</h2>
      <p class="text-sm mb-4" style="color: var(--paper-dim)">
        "{{ transaction.label }}" · {{ format(transaction.amount) }} — this can't be undone.
      </p>
      <div class="flex gap-2">
        <button
          @click="emit('cancel')"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium border"
          style="border-color: var(--ink-line); color: var(--paper)"
        >
          Cancel
        </button>
        <button
          @click="emit('confirm')"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style="background: var(--money-out); color: var(--ink)"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
