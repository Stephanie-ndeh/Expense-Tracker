<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ back: [] }>()
const { monthlyTrend, monthComparison, categoryComparison, savings, thisMonthSpend } = useLedger()
const { format } = useSettings()

const months = ref(6)
const data = computed(() => monthlyTrend(months.value))
const max = computed(() => Math.max(1, ...data.value.flatMap((d) => [d.income, d.expense])))
function barHeight(value: number) {
  return Math.max(2, (value / max.value) * 100)
}

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

const expenseDelta = computed(() => delta(monthComparison.value.expense.current, monthComparison.value.expense.previous))
const incomeDelta = computed(() => delta(monthComparison.value.income.current, monthComparison.value.income.previous))
</script>

<template>
  <div class="min-h-screen pb-10" style="background: var(--ink); color: var(--paper)">
    <header class="flex items-center gap-3 px-5 pt-5 pb-2">
      <button @click="emit('back')" aria-label="Back" class="text-lg leading-none" style="color: var(--paper-dim)">‹</button>
      <h1 class="text-sm font-semibold">Trends</h1>
    </header>

    <!-- Chart -->
    <div class="px-5 pt-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3 text-[11px]" style="color: var(--paper-dim)">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background: var(--money-in)" /> Income</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background: var(--money-out)" /> Spent</span>
        </div>
        <div class="flex gap-1">
          <button
            v-for="m in [6, 12]"
            :key="m"
            @click="months = m"
            class="text-[11px] px-2 py-1 rounded-md border"
            :style="
              months === m
                ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
                : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
            "
          >
            {{ m }}mo
          </button>
        </div>
      </div>

      <div class="flex items-end justify-between gap-1" style="height: 160px">
        <div v-for="m in data" :key="m.month" class="flex-1 flex flex-col items-center justify-end h-full">
          <div class="flex items-end gap-1 flex-1 w-full justify-center">
            <div
              class="w-2 rounded-t-sm"
              :style="{ height: barHeight(m.income) + 'px', background: 'var(--money-in)', opacity: m.income ? 1 : 0.15 }"
              :title="format(m.income)"
            />
            <div
              class="w-2 rounded-t-sm"
              :style="{ height: barHeight(m.expense) + 'px', background: 'var(--money-out)', opacity: m.expense ? 1 : 0.15 }"
              :title="format(m.expense)"
            />
          </div>
          <span class="text-[10px] mt-2" style="color: var(--paper-dim)">{{ m.label }}</span>
        </div>
      </div>
    </div>

    <!-- Month over month -->
    <div class="px-5 pt-8">
      <h3 class="text-xs uppercase tracking-wide mb-3" style="color: var(--paper-dim)">
        {{ monthComparison.currentLabel }} vs {{ monthComparison.previousLabel }}
      </h3>
      <div class="grid grid-cols-2 gap-px" :style="{ background: 'var(--ink-line)' }">
        <div class="px-3 py-4" style="background: var(--ink)">
          <p class="text-[11px] uppercase tracking-wide" style="color: var(--paper-dim)">Spent</p>
          <p class="font-mono text-lg font-medium mt-1 tabular-nums" style="color: var(--money-out)">
            {{ format(monthComparison.expense.current) }}
          </p>
          <p class="text-xs mt-0.5" :style="{ color: expenseDelta > 0 ? 'var(--money-out)' : 'var(--money-in)' }">
            {{ expenseDelta > 0 ? '↑' : expenseDelta < 0 ? '↓' : '·' }} {{ Math.abs(expenseDelta) }}% vs last month
          </p>
        </div>
        <div class="px-3 py-4" style="background: var(--ink)">
          <p class="text-[11px] uppercase tracking-wide" style="color: var(--paper-dim)">Received</p>
          <p class="font-mono text-lg font-medium mt-1 tabular-nums" style="color: var(--money-in)">
            {{ format(monthComparison.income.current) }}
          </p>
          <p class="text-xs mt-0.5" :style="{ color: incomeDelta >= 0 ? 'var(--money-in)' : 'var(--money-out)' }">
            {{ incomeDelta > 0 ? '↑' : incomeDelta < 0 ? '↓' : '·' }} {{ Math.abs(incomeDelta) }}% vs last month
          </p>
        </div>
      </div>
    </div>

    <!-- Savings snapshot -->
    <div class="px-5 pt-6">
      <h3 class="text-xs uppercase tracking-wide mb-2" style="color: var(--paper-dim)">Savings</h3>
      <div class="flex items-baseline justify-between py-3 border-b" style="border-color: var(--ink-line)">
        <span class="text-sm" style="color: var(--paper-dim)">Total saved so far</span>
        <span class="font-mono text-lg font-medium tabular-nums" style="color: var(--accent)">{{ format(savings) }}</span>
      </div>
    </div>

    <!-- Category comparison -->
    <div class="px-5 pt-6">
      <h3 class="text-xs uppercase tracking-wide mb-2" style="color: var(--paper-dim)">Where it went this month</h3>
      <p v-if="!categoryComparison.length" class="text-sm py-6 text-center" style="color: var(--paper-dim)">
        No expenses logged this month yet.
      </p>
      <div
        v-for="c in categoryComparison"
        :key="c.label"
        class="flex items-center justify-between py-2.5 border-b"
        style="border-color: var(--ink-line)"
      >
        <span class="text-sm truncate">{{ c.label }}</span>
        <div class="flex items-center gap-3 shrink-0">
          <span
            v-if="c.previous"
            class="text-xs"
            :style="{ color: c.current > c.previous ? 'var(--money-out)' : c.current < c.previous ? 'var(--money-in)' : 'var(--paper-dim)' }"
          >
            {{ c.current > c.previous ? '↑' : c.current < c.previous ? '↓' : '·' }} was {{ format(c.previous) }}
          </span>
          <span class="font-mono text-sm font-medium tabular-nums">{{ format(c.current) }}</span>
        </div>
      </div>
    </div>

    <p class="px-5 pt-8 text-xs" style="color: var(--paper-dim)">
      This month so far: {{ format(thisMonthSpend) }} spent.
    </p>
  </div>
</template>
