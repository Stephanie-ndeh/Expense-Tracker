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
      style="background: var(--surface)"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">People</h2>
        <button class="text-sm" style="color: var(--text-dim)" @click="emit('close')">Close</button>
      </div>

      <p v-if="!personSummaries.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
        No lending or borrowing logged yet.
      </p>

      <div v-for="p in personSummaries" :key="p.name" class="border-b" style="border-color: var(--line)">
        <button class="w-full flex items-center justify-between py-3 text-left" @click="toggle(p.name)">
          <div class="min-w-0">
            <p class="text-sm font-medium">{{ p.name }}</p>
            <p class="text-xs" style="color: var(--text-dim)">
              <template v-if="p.lent || p.repaid"
                >Lent {{ format(p.lent) }} · Paid back {{ format(p.repaid) }}</template
              >
              <template v-if="p.borrowed || p.paidBack">
                <br v-if="p.lent || p.repaid" />
                Borrowed {{ format(p.borrowed) }} · Repaid {{ format(p.paidBack) }}
              </template>
            </p>
          </div>
          <div class="text-right shrink-0 pl-3">
            <p v-if="p.netOwed > 0" class="text-sm font-medium tabular-nums" style="color: var(--money-in)">
              {{ format(p.netOwed) }} owed to you
            </p>
            <p v-else-if="p.netOwed < 0" class="text-sm font-medium tabular-nums" style="color: var(--money-out)">
              {{ format(Math.abs(p.netOwed)) }} overpaid to you
            </p>
            <p v-if="p.netOwe > 0" class="text-sm font-medium tabular-nums" style="color: var(--money-out)">
              {{ format(p.netOwe) }} you owe
            </p>
            <p v-else-if="p.netOwe < 0" class="text-sm font-medium tabular-nums" style="color: var(--money-in)">
              {{ format(Math.abs(p.netOwe)) }} overpaid by you
            </p>
            <p v-if="!p.netOwed && !p.netOwe" class="text-sm" style="color: var(--text-dim)">Settled</p>
          </div>
        </button>

        <div v-if="expanded === p.name" class="pb-3 pl-1">
          <div v-for="t in p.transactions" :key="t.id" class="flex items-center justify-between py-1.5 text-xs">
            <span style="color: var(--text-dim)">
              {{ t.date }} · {{ TYPE_META[t.type].verb }}<template v-if="t.planned"> (planned)</template>
            </span>
            <span
              class="tabular-nums"
              :style="{ color: TYPE_META[t.type].sign > 0 ? 'var(--money-in)' : 'var(--money-out)' }"
            >
              {{ TYPE_META[t.type].sign > 0 ? '+' : '−' }}{{ format(t.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
