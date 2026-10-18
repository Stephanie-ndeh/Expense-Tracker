<script setup lang="ts">
import { useSettings } from '../composables/useSettings'
import type { Theme } from '../composables/useSettings'

const emit = defineEmits<{ back: [] }>()
const { theme, setTheme } = useSettings()

const options: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
</script>

<template>
  <div class="pb-10" style="background: var(--bg); color: var(--text); min-height: 100vh">
    <header class="flex items-center gap-3 px-5 pt-5 pb-2">
      <button aria-label="Back" class="text-lg leading-none" style="color: var(--text-dim)" @click="emit('back')">
        ‹
      </button>
      <h1 class="text-sm font-semibold">Appearance</h1>
    </header>

    <div class="px-5 pt-2 flex flex-col gap-2">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        class="flex items-center justify-between rounded-xl px-4 py-3 border text-sm font-medium"
        :style="
          theme.theme === o.value
            ? { background: 'var(--surface)', borderColor: 'var(--accent)', color: 'var(--text)' }
            : { background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--text)' }
        "
        @click="setTheme(o.value)"
      >
        {{ o.label }}
        <span v-if="theme.theme === o.value" style="color: var(--accent-text)">✓</span>
      </button>
    </div>
  </div>
</template>
