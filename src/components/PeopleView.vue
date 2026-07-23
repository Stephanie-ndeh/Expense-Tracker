<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { TYPE_META } from '../types/transaction'

const emit = defineEmits<{ close: [] }>()
const { personSummaries } = useLedger()
const { format } = useSettings()

const expanded = ref<string | null>(null)
function toggle(name: string) {
  expanded.value = expanded.value === name ? null : name
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
    <div
      class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto"
      style="background: var(--ink-raised)"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">People</h2>
        <button @click="emit('close')" class="text-sm" style="color: var(--paper-dim)">Close</button>
      </div>

      <p v-if="!personSummaries.length" class="text-sm py-6 text-center" style="color: var(--paper-dim)">
        You haven't lent anyone money yet.
      </p>

      <div v-for="p in personSummaries" :key="p.name" class="border-b" style="border-color: var(--ink-line)">
        <button class="w-full flex items-center justify-between py-3 text-left" @click="toggle(p.name)">
          <div>
            <p class="text-sm font-medium">{{ p.name }}</p>
            <p class="text-xs" style="color: var(--paper-dim)">
              Lent {{ format(p.lent) }} · Paid back {{ format(p.repaid) }}
            </p>
          </div>
          <span
            class="font-mono text-sm font-medium tabular-nums shrink-0 pl-3"
            :style="{ color: p.netOwed > 0 ? 'var(--money-in)' : p.netOwed < 0 ? 'var(--money-out)' : 'var(--paper-dim)' }"
          >
            {{ p.netOwed > 0 ? format(p.netOwed) : p.netOwed < 0 ? '−' + format(Math.abs(p.netOwed)) : 'Settled' }}
          </span>
        </button>

        <div v-if="expanded === p.name" class="pb-3 pl-1">
          <div v-for="t in p.transactions" :key="t.id" class="flex items-center justify-between py-1.5 text-xs">
            <span style="color: var(--paper-dim)">
              {{ t.date }} · {{ TYPE_META[t.type].verb }}<template v-if="t.planned"> (planned)</template>
            </span>
            <span
              class="font-mono tabular-nums"
              :style="{ color: t.type === 'lend' ? 'var(--money-out)' : 'var(--money-in)' }"
            >
              {{ t.type === 'lend' ? '−' : '+' }}{{ format(t.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
