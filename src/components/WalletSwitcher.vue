<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWallets } from '../composables/useWallets'

const { wallets, activeWalletId } = useWallets()
const open = ref(false)

const activeLabel = computed(() => {
  if (activeWalletId.value === 'all') return 'All wallets'
  return wallets.value.find((w) => w.id === activeWalletId.value)?.name ?? 'All wallets'
})
const activeInitial = computed(() => activeLabel.value.charAt(0).toUpperCase())

function select(id: string) {
  activeWalletId.value = id
  open.value = false
}
</script>

<template>
  <div class="relative px-5 pt-3">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3.5 border"
      style="
        height: 44px;
        background: var(--surface);
        border-color: var(--line);
        color: var(--text);
        font-size: 15px;
        font-weight: 600;
      "
      @click="open = !open"
    >
      <span
        class="rounded-full flex items-center justify-center shrink-0"
        style="
          width: 32px;
          height: 32px;
          background: var(--accent);
          color: var(--on-accent);
          font-size: 13px;
          font-weight: 800;
        "
      >
        {{ activeInitial }}
      </span>
      {{ activeLabel }}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-dim)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-40" @click="open = false" />
      <div
        class="absolute left-5 top-[calc(100%-2px)] z-50 rounded-2xl border overflow-hidden"
        style="background: var(--surface); border-color: var(--line); min-width: 200px"
      >
        <button
          type="button"
          class="w-full flex items-center px-4 py-3 text-left text-sm"
          :style="
            activeWalletId === 'all'
              ? { color: 'var(--accent-text)', fontWeight: 700 }
              : { color: 'var(--text)', fontWeight: 500 }
          "
          @click="select('all')"
        >
          All wallets
        </button>
        <button
          v-for="w in wallets"
          :key="w.id"
          type="button"
          class="w-full flex items-center px-4 py-3 text-left text-sm border-t"
          :style="
            activeWalletId === w.id
              ? { borderColor: 'var(--line)', color: 'var(--accent-text)', fontWeight: 700 }
              : { borderColor: 'var(--line)', color: 'var(--text)', fontWeight: 500 }
          "
          @click="select(w.id)"
        >
          {{ w.name }}
        </button>
      </div>
    </template>
  </div>
</template>
