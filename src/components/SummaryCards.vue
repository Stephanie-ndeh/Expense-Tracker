<script setup lang="ts">
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ openPeople: [] }>()
const { totalOwedToYou, totalOwedByYou, savings } = useLedger()
const { format } = useSettings()

const cards = [
  { key: 'owed', label: 'Owed to you', value: () => totalOwedToYou.value, tint: 'var(--money-in)', clickable: true },
  { key: 'owe', label: 'You owe', value: () => totalOwedByYou.value, tint: 'var(--money-out)', clickable: true },
  { key: 'savings', label: 'Savings', value: () => savings.value, tint: 'var(--savings)', clickable: false },
] as const
</script>

<template>
  <div
    class="mx-5 grid grid-cols-3 rounded-[18px] border"
    style="background: var(--surface); border-color: var(--line)"
  >
    <component
      :is="c.clickable ? 'button' : 'div'"
      v-for="(c, i) in cards"
      :key="c.key"
      class="px-3.5 py-3.5 text-left flex flex-col gap-1.5"
      :style="{ borderRight: i < cards.length - 1 ? '1px solid var(--line)' : 'none' }"
      @click="c.clickable && emit('openPeople')"
    >
      <p class="text-xs" style="color: var(--text-dim); font-weight: 500">{{ c.label }}</p>
      <p class="text-[17px] font-bold" :style="{ color: c.tint }">
        {{ format(c.value()) }}
      </p>
    </component>
  </div>
</template>
