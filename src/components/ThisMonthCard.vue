<script setup lang="ts">
import { computed } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ openInsights: [] }>()
const { monthComparison } = useLedger()
const { format } = useSettings()

const comparison = computed(() => monthComparison(0))
const previousMonthName = computed(() => comparison.value.previousLabel.split(' ')[0])

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

const expenseDelta = computed(() => delta(comparison.value.expense.current, comparison.value.expense.previous))
</script>

<template>
  <button
    type="button"
    class="mx-5 flex items-center gap-3.5 rounded-[18px] px-4 py-3.5 text-left border"
    style="background: var(--accent-surface); border-color: var(--accent-surface-line)"
    @click="emit('openInsights')"
  >
    <div class="flex-1 min-w-0 flex flex-col gap-1">
      <p class="text-xs font-bold" style="color: var(--accent-text)">This month</p>
      <p class="text-sm leading-snug" style="color: var(--text)">
        Spent <b class="font-bold">{{ format(comparison.expense.current) }}</b> · received
        <b class="font-bold">{{ format(comparison.income.current) }}</b
        >. {{ expenseDelta > 0 ? 'Up' : expenseDelta < 0 ? 'Down' : 'Flat' }} {{ Math.abs(expenseDelta) }}% on
        {{ previousMonthName }}.
      </p>
    </div>
    <span
      class="rounded-full flex items-center justify-center shrink-0"
      style="width: 44px; height: 44px; background: var(--accent-surface-line); color: var(--accent-text)"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </span>
  </button>
</template>
