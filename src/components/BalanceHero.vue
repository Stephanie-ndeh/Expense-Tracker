<script setup lang="ts">
import { computed } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'

const { balance, thisMonthSpend } = useLedger()
const { format } = useSettings()
const { wallets, activeWalletId } = useWallets()

const isNegative = computed(() => balance.value < 0)

const activeWalletName = computed(() => wallets.value.find((w) => w.id === activeWalletId.value)?.name ?? '')
const showFrontedBanner = computed(() => activeWalletId.value !== 'all' && balance.value < 0)
</script>

<template>
  <div class="px-5 pt-8 pb-6 border-b" :style="{ borderColor: 'var(--ink-line)' }">
    <p class="text-xs tracking-[0.2em] uppercase" style="color: var(--paper-dim)">You currently have</p>
    <p
      class="font-mono text-5xl sm:text-6xl font-semibold mt-2 tabular-nums tracking-tight"
      :style="{ color: isNegative ? 'var(--money-out)' : 'var(--paper)' }"
    >
      {{ format(balance) }}
    </p>
    <p class="text-sm mt-2" style="color: var(--paper-dim)">
      {{ format(thisMonthSpend) }} spent so far this month
    </p>

    <div
      v-if="showFrontedBanner"
      class="mt-4 rounded-xl px-4 py-3 text-sm font-medium"
      style="background: color-mix(in srgb, var(--money-out) 18%, transparent); color: var(--money-out); border: 1px solid var(--money-out)"
    >
      You've fronted {{ format(Math.abs(balance)) }} on {{ activeWalletName }} — remember to claim it back.
    </div>
  </div>
</template>
