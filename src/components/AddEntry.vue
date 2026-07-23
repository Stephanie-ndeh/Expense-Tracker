<script setup lang="ts">
import { reactive } from 'vue'
import type { TransactionType } from '../types/transaction'
import { TYPE_META } from '../types/transaction'
import { useLedger } from '../composables/useLedger'

const emit = defineEmits<{ close: [] }>()
const { addTransaction } = useLedger()

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  type: 'expense' as TransactionType,
  amount: '',
  label: '',
  note: '',
  date: today,
  planned: false,
})

const types: { value: TransactionType; short: string }[] = [
  { value: 'expense', short: 'Spent' },
  { value: 'income', short: 'Received' },
  { value: 'lend', short: 'Lent out' },
  { value: 'repay', short: 'Paid back' },
  { value: 'save', short: 'Saved' },
  { value: 'withdraw', short: 'From savings' },
]

function submit() {
  const amount = parseFloat(form.amount)
  if (!amount || amount <= 0) return
  addTransaction({
    type: form.type,
    amount,
    label: form.label.trim() || TYPE_META[form.type].labelHint,
    note: form.note.trim(),
    date: form.date,
    planned: form.planned || form.date > today,
  })
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
    <form
      @submit.prevent="submit"
      class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto"
      style="background: var(--ink-raised)"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Add entry</h2>
        <button type="button" @click="emit('close')" class="text-sm" style="color: var(--paper-dim)">Cancel</button>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-5">
        <button
          v-for="t in types"
          :key="t.value"
          type="button"
          @click="form.type = t.value"
          class="text-xs py-2 rounded-lg border transition-colors"
          :style="
            form.type === t.value
              ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
              : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
          "
        >
          {{ t.short }}
        </button>
      </div>

      <label class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Amount</span>
        <input
          v-model="form.amount"
          type="number"
          inputmode="decimal"
          min="0"
          step="any"
          required
          autofocus
          placeholder="0"
          class="w-full mt-1 bg-transparent font-mono text-3xl font-semibold outline-none tabular-nums"
          style="color: var(--paper)"
        />
      </label>

      <label class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">{{ TYPE_META[form.type].labelHint }}</span>
        <input
          v-model="form.label"
          type="text"
          class="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </label>

      <label class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Note (optional)</span>
        <input
          v-model="form.note"
          type="text"
          class="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </label>

      <div class="flex items-center gap-3 mb-6">
        <label class="flex-1">
          <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Date</span>
          <input
            v-model="form.date"
            type="date"
            class="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none border"
            style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
          />
        </label>
        <label class="flex items-center gap-2 pt-5 text-sm select-none" style="color: var(--paper-dim)">
          <input v-model="form.planned" type="checkbox" class="accent-[color:var(--accent)]" />
          Just planned
        </label>
      </div>

      <button
        type="submit"
        class="w-full py-3 rounded-xl font-medium text-sm"
        style="background: var(--accent); color: var(--ink)"
      >
        Save entry
      </button>
    </form>
  </div>
</template>
