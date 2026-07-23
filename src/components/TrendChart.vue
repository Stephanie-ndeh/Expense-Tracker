<script setup lang="ts">
import { computed } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ openTrends: [] }>()
const { monthlyTrend } = useLedger()
const { format } = useSettings()

const data = computed(() => monthlyTrend(6))
const max = computed(() => Math.max(1, ...data.value.flatMap((d) => [d.income, d.expense])))

function barHeight(value: number) {
  return Math.max(2, (value / max.value) * 100)
}
</script>

<template>
  <button type="button" class="block w-full text-left px-5 pt-6 pb-4" @click="emit('openTrends')">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Last 6 months</h3>
      <span class="text-xs" style="color: var(--accent)">See details ›</span>
    </div>

    <div class="flex items-end justify-between gap-2" style="height: 140px">
      <div v-for="m in data" :key="m.month" class="flex-1 flex flex-col items-center justify-end h-full">
        <div class="flex items-end gap-1 flex-1 w-full justify-center">
          <div
            class="w-2.5 rounded-t-sm"
            :style="{ height: barHeight(m.income) + 'px', background: 'var(--money-in)', opacity: m.income ? 1 : 0.15 }"
            :title="format(m.income)"
          />
          <div
            class="w-2.5 rounded-t-sm"
            :style="{ height: barHeight(m.expense) + 'px', background: 'var(--money-out)', opacity: m.expense ? 1 : 0.15 }"
            :title="format(m.expense)"
          />
        </div>
        <span class="text-[10px] mt-2" style="color: var(--paper-dim)">{{ m.label }}</span>
      </div>
    </div>
  </button>
</template>
