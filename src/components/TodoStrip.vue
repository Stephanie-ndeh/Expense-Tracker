<script setup lang="ts">
import { useTodos } from '../composables/useTodos'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ open: [] }>()
const { dueThisWeekSummary } = useTodos()
const { format } = useSettings()
</script>

<template>
  <button
    v-if="dueThisWeekSummary"
    type="button"
    class="mx-5 flex items-center gap-3 rounded-2xl border pl-3.5 text-left"
    style="min-height: 48px; border-color: var(--line); color: var(--text)"
    @click="emit('open')"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-dim)"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M8 3v3M16 3v3M3.5 10h17" />
    </svg>
    <span class="flex-1 text-sm font-semibold">
      {{ dueThisWeekSummary.count }} to-do{{ dueThisWeekSummary.count === 1 ? '' : 's' }} due this week
      <span style="color: var(--text-dim); font-weight: 500">·</span>
      <span style="color: var(--money-out); font-weight: 700">{{ format(dueThisWeekSummary.total) }}</span>
    </span>
    <span class="flex items-center justify-center shrink-0" style="width: 36px; height: 36px; color: var(--text-dim)">
      <svg
        width="16"
        height="16"
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
