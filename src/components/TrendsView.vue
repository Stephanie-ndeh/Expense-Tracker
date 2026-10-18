<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'

const { monthlyTrend, monthComparison, categoryComparison } = useLedger()
const { format } = useSettings()

const data = computed(() => monthlyTrend(6))
const max = computed(() => Math.max(1, ...data.value.flatMap((d) => [d.income, d.expense])))
function barHeight(value: number) {
  return Math.max(2, (value / max.value) * 100)
}

const monthOffset = ref(0)
const comparison = computed(() => monthComparison(monthOffset.value))
const categories = computed(() => categoryComparison(monthOffset.value))
const maxCategoryAmount = computed(() => Math.max(1, ...categories.value.map((c) => c.current)))
const topCategory = computed(() => categories.value[0] ?? null)

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

const expenseDelta = computed(() => delta(comparison.value.expense.current, comparison.value.expense.previous))
const incomeDelta = computed(() => delta(comparison.value.income.current, comparison.value.income.previous))
</script>

<template>
  <div class="pb-10 px-5">
    <div class="flex items-center justify-between pt-4">
      <button
        type="button"
        aria-label="Previous month"
        class="rounded-full border flex items-center justify-center shrink-0"
        style="width: 44px; height: 44px; border-color: var(--line); color: var(--text)"
        @click="monthOffset -= 1"
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
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <div class="text-base font-bold">{{ comparison.currentLabel }}</div>
      <button
        type="button"
        aria-label="Next month"
        :disabled="monthOffset >= 0"
        class="rounded-full border flex items-center justify-center shrink-0 disabled:opacity-40"
        style="width: 44px; height: 44px; border-color: var(--line); color: var(--text)"
        @click="monthOffset += 1"
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
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2.5 pt-4">
      <div
        class="p-3.5 rounded-2xl border flex flex-col gap-1.5"
        style="background: var(--surface); border-color: var(--line)"
      >
        <p class="text-xs font-semibold" style="color: var(--text-dim)">Spent</p>
        <p class="text-[22px] font-extrabold tracking-tight" style="color: var(--money-out)">
          {{ format(comparison.expense.current) }}
        </p>
        <p class="text-xs font-semibold" :style="{ color: expenseDelta <= 0 ? 'var(--money-in)' : 'var(--warn-text)' }">
          {{ expenseDelta > 0 ? '↑' : expenseDelta < 0 ? '↓' : '·' }} {{ Math.abs(expenseDelta) }}% vs
          {{ comparison.previousLabel.split(' ')[0] }}
        </p>
      </div>
      <div
        class="p-3.5 rounded-2xl border flex flex-col gap-1.5"
        style="background: var(--surface); border-color: var(--line)"
      >
        <p class="text-xs font-semibold" style="color: var(--text-dim)">Received</p>
        <p class="text-[22px] font-extrabold tracking-tight" style="color: var(--money-in)">
          {{ format(comparison.income.current) }}
        </p>
        <p class="text-xs font-semibold" :style="{ color: incomeDelta >= 0 ? 'var(--money-in)' : 'var(--warn-text)' }">
          {{ incomeDelta > 0 ? '↑' : incomeDelta < 0 ? '↓' : '·' }} {{ Math.abs(incomeDelta) }}% vs
          {{ comparison.previousLabel.split(' ')[0] }}
        </p>
      </div>
    </div>

    <div
      class="p-3.5 pb-2.5 mt-4 rounded-2xl border flex flex-col gap-2.5"
      style="background: var(--surface); border-color: var(--line)"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-[13px] font-bold">Last 6 months</h3>
        <div class="flex gap-3 text-[11px] font-semibold" style="color: var(--text-dim)">
          <span class="flex items-center gap-1.5"
            ><span class="w-2 h-2 rounded-sm inline-block" style="background: var(--money-in)" /> In</span
          >
          <span class="flex items-center gap-1.5"
            ><span class="w-2 h-2 rounded-sm inline-block" style="background: var(--money-out)" /> Out</span
          >
        </div>
      </div>

      <div class="grid grid-cols-6 gap-1.5 items-end border-b" style="height: 120px; border-color: var(--line)">
        <div v-for="m in data" :key="m.month" class="flex justify-center items-end gap-[3px]" style="height: 120px">
          <span
            class="w-2.5 rounded-t-sm"
            :style="{ height: barHeight(m.income) + 'px', background: 'var(--money-in)', opacity: m.income ? 1 : 0.15 }"
          />
          <span
            class="w-2.5 rounded-t-sm"
            :style="{
              height: barHeight(m.expense) + 'px',
              background: 'var(--money-out)',
              opacity: m.expense ? 1 : 0.15,
            }"
          />
        </div>
      </div>
      <div class="grid grid-cols-6 gap-1.5 pb-1">
        <div
          v-for="m in data"
          :key="m.month"
          class="text-center text-[11px] font-semibold"
          style="color: var(--text-dim)"
        >
          {{ m.label }}
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3 mt-6">
      <h3 class="text-base font-bold">Where it went</h3>
      <p v-if="!categories.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
        No expenses logged this month yet.
      </p>
      <div v-for="c in categories" :key="c.label" class="flex flex-col gap-1.5">
        <div class="flex justify-between items-baseline">
          <span class="text-sm font-semibold">
            {{ c.label }}
            <span v-if="c.previous" class="text-xs font-medium" style="color: var(--text-dim)">
              {{ c.current > c.previous ? '↑' : c.current < c.previous ? '↓' : '·' }} from {{ format(c.previous) }}
            </span>
          </span>
          <span class="text-sm font-bold">{{ format(c.current) }}</span>
        </div>
        <div class="rounded-full" style="height: 6px; background: var(--line)">
          <div
            class="rounded-full"
            style="height: 6px; background: var(--accent)"
            :style="{ width: (c.current / maxCategoryAmount) * 100 + '%' }"
          />
        </div>
      </div>
    </div>

    <div
      v-if="topCategory && topCategory.label === 'Other'"
      class="flex gap-2.5 mt-5 p-3.5 rounded-2xl border"
      style="background: var(--accent-surface); border-color: var(--accent-surface-line)"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent-text)"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
      </svg>
      <p class="text-[13px] leading-snug" style="color: var(--accent-text)">
        "Other" is your biggest category at {{ format(topCategory.current) }}. Split it up to see where it really goes.
      </p>
    </div>
  </div>
</template>
