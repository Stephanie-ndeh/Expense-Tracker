<script setup lang="ts">
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ openPeople: [] }>()
const { totalOwedToYou, savings, plannedSpend } = useLedger()
const { format } = useSettings()

const cards = [
  { key: 'owed', label: 'Owed to you', value: () => totalOwedToYou.value, tint: 'var(--money-in)', clickable: true },
  { key: 'savings', label: 'In savings', value: () => savings.value, tint: 'var(--accent)', clickable: false },
  { key: 'planned', label: 'Coming up', value: () => plannedSpend.value, tint: 'var(--money-out)', clickable: false },
] as const
</script>

<template>
  <div class="grid grid-cols-3 gap-px" :style="{ background: 'var(--ink-line)' }">
    <component
      :is="c.clickable ? 'button' : 'div'"
      v-for="c in cards"
      :key="c.key"
      class="px-3 py-4 text-left"
      style="background: var(--ink)"
      @click="c.clickable && emit('openPeople')"
    >
      <p class="text-[11px] uppercase tracking-wide" style="color: var(--paper-dim)">
        {{ c.label }}<span v-if="c.clickable"> ›</span>
      </p>
      <p class="font-mono text-lg font-medium mt-1 tabular-nums" :style="{ color: c.tint }">
        {{ format(c.value()) }}
      </p>
    </component>
  </div>
</template>
