<script setup lang="ts">
import { computed } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'

const { balance } = useLedger()
const { format } = useSettings()
const { wallets, activeWalletId } = useWallets()

const activeWalletName = computed(() =>
  activeWalletId.value === 'all'
    ? 'all wallets'
    : (wallets.value.find((w) => w.id === activeWalletId.value)?.name ?? ''),
)
const showFrontedBanner = computed(() => activeWalletId.value !== 'all' && balance.value < 0)
</script>

<template>
  <div class="px-5 pt-6 pb-4 flex flex-col gap-1.5">
    <p class="text-xs" style="color: var(--text-dim); font-weight: 500">Available in {{ activeWalletName }}</p>
    <p class="text-5xl sm:text-6xl font-bold tracking-tight" style="color: var(--text)">
      {{ format(balance) }}
    </p>

    <div
      v-if="showFrontedBanner"
      class="mt-1.5 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 text-xs font-bold"
      style="background: var(--warn-bg); color: var(--warn-text); height: 28px"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 8v5M12 16.5v.5" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      Overspent — claim {{ format(Math.abs(balance)) }} back
    </div>
  </div>
</template>
