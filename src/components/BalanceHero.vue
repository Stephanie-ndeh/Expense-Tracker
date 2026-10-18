<script setup lang="ts">
import { computed } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'

const { balance, thisMonthSpend } = useLedger()
const { format } = useSettings()
const { wallets, activeWalletId } = useWallets()

const activeWalletName = computed(() => wallets.value.find((w) => w.id === activeWalletId.value)?.name ?? '')
const showFrontedBanner = computed(() => activeWalletId.value !== 'all' && balance.value < 0)
</script>

<template>
  <div class="px-5 pt-8 pb-6 border-b" :style="{ borderColor: 'var(--line)' }">
    <p class="text-xs tracking-[0.2em] uppercase" style="color: var(--text-dim)">You currently have</p>
    <p class="text-5xl sm:text-6xl font-semibold mt-2 tracking-tight" style="color: var(--text)">
      {{ format(balance) }}
    </p>
    <p class="text-sm mt-2" style="color: var(--text-dim)">{{ format(thisMonthSpend) }} spent so far this month</p>

    <div
      v-if="showFrontedBanner"
      class="mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-medium"
      style="background: var(--warn-bg); color: var(--warn-text)"
    >
      You've fronted {{ format(Math.abs(balance)) }} on {{ activeWalletName }} — remember to claim it back.
    </div>
  </div>
</template>
