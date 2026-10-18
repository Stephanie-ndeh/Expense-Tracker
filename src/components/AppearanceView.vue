<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useLedger } from '../composables/useLedger'
import type { Theme } from '../composables/useSettings'

const emit = defineEmits<{ back: [] }>()
const { theme, setTheme, format } = useSettings()
const { balance, monthComparison, savings } = useLedger()

const comparison = computed(() => monthComparison(0))

const systemPrefersDark = ref(
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true,
)
let media: MediaQueryList | null = null
function onSystemChange(e: MediaQueryListEvent) {
  systemPrefersDark.value = e.matches
}
onMounted(() => {
  if (typeof window === 'undefined') return
  media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onSystemChange)
})
onUnmounted(() => {
  media?.removeEventListener('change', onSystemChange)
})

// Illustrative preview-swatch colours: these depict what each theme choice looks
// like regardless of the app's own current theme, so they can't be CSS variables.
const SWATCH = {
  light: { bg: '#f7f5f0', ink: '#cfcabf', card: '#ffffff' },
  dark: { bg: '#12151c', ink: '#3a4050', card: '#1a1e28' },
}

const options: { value: Theme; label: string; left: typeof SWATCH.light; right: typeof SWATCH.light }[] = [
  { value: 'system', label: 'System', left: SWATCH.light, right: SWATCH.dark },
  { value: 'light', label: 'Light', left: SWATCH.light, right: SWATCH.light },
  { value: 'dark', label: 'Dark', left: SWATCH.dark, right: SWATCH.dark },
]

const caption = computed(() => {
  if (theme.theme === 'light') return 'Always light, whatever your phone is set to. Easier to read outdoors.'
  if (theme.theme === 'dark') return 'Always dark, whatever your phone is set to. Easier on the eyes at night.'
  return `Follows your phone's setting and switches by itself when it changes. Your phone is in ${systemPrefersDark.value ? 'dark' : 'light'} mode right now.`
})
</script>

<template>
  <div
    class="min-h-screen pb-7 px-5 pt-[18px] flex flex-col gap-[22px]"
    style="background: var(--bg); color: var(--text)"
  >
    <div class="flex items-center gap-2.5" style="min-height: 44px">
      <button
        aria-label="Back to Me"
        class="rounded-full border flex items-center justify-center"
        style="width: 44px; height: 44px; border-color: var(--line); color: var(--text)"
        @click="emit('back')"
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
      <h1 class="text-[22px] font-extrabold">Appearance</h1>
    </div>

    <div class="grid grid-cols-3 gap-2.5">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        :aria-pressed="theme.theme === o.value"
        class="flex flex-col gap-2.5 items-center px-2 pt-2.5 pb-3 rounded-2xl border-2"
        :style="{
          background: 'var(--surface)',
          borderColor: theme.theme === o.value ? 'var(--accent)' : 'var(--line)',
          color: 'var(--text)',
        }"
        @click="setTheme(o.value)"
      >
        <span
          class="w-full rounded-[10px] overflow-hidden flex border"
          style="height: 120px; border-color: var(--line)"
        >
          <span class="flex-1 flex flex-col gap-1.5 p-2" :style="{ background: o.left.bg }">
            <span class="rounded-sm" style="height: 6px; width: 60%" :style="{ background: o.left.ink }" />
            <span class="rounded" style="height: 14px; width: 80%" :style="{ background: o.left.ink }" />
            <span class="rounded" style="height: 22px; width: 100%" :style="{ background: o.left.card }" />
            <span class="rounded-sm" style="height: 6px; width: 50%; background: #d9b97a" />
          </span>
          <span class="flex-1 flex flex-col gap-1.5 p-2" :style="{ background: o.right.bg }">
            <span class="rounded-sm" style="height: 6px; width: 60%" :style="{ background: o.right.ink }" />
            <span class="rounded" style="height: 14px; width: 80%" :style="{ background: o.right.ink }" />
            <span class="rounded" style="height: 22px; width: 100%" :style="{ background: o.right.card }" />
            <span class="rounded-sm" style="height: 6px; width: 50%; background: #d9b97a" />
          </span>
        </span>
        <span class="flex items-center gap-1.5 text-sm font-bold">
          <span
            class="rounded-full border-2 flex items-center justify-center shrink-0"
            style="width: 16px; height: 16px"
            :style="{ borderColor: theme.theme === o.value ? 'var(--accent)' : 'var(--line)' }"
          >
            <span
              class="rounded-full"
              style="width: 6px; height: 6px"
              :style="{ background: theme.theme === o.value ? 'var(--accent)' : 'transparent' }"
            />
          </span>
          {{ o.label }}
        </span>
      </button>
    </div>

    <p class="text-sm leading-relaxed" style="color: var(--text-dim)">{{ caption }}</p>

    <div
      class="rounded-2xl border p-4 flex flex-col gap-2.5"
      style="background: var(--surface); border-color: var(--line)"
    >
      <p class="text-xs font-bold" style="color: var(--text-dim)">Preview</p>
      <p class="text-[13px]" style="color: var(--text-dim)">Available in all wallets</p>
      <p class="text-[32px] font-extrabold tracking-tight">
        {{ format(balance) }}
      </p>
      <div class="flex gap-4 text-sm font-bold">
        <span style="color: var(--money-in)">+{{ format(comparison.income.current) }} in</span>
        <span style="color: var(--money-out)">−{{ format(comparison.expense.current) }} out</span>
        <span style="color: var(--savings)">{{ format(savings) }} saved</span>
      </div>
      <span
        class="self-start mt-1 rounded-xl px-4 flex items-center text-sm font-extrabold"
        style="height: 40px; background: var(--accent); color: var(--on-accent)"
      >
        Save entry
      </span>
    </div>

    <p class="mt-auto text-xs text-center" style="color: var(--text-dim)">
      Saved on this device only, so your phone and laptop can differ.
    </p>
  </div>
</template>
