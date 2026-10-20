<script setup lang="ts">
import WalletSwitcher from './WalletSwitcher.vue'
import BalanceHero from './BalanceHero.vue'
import SummaryCards from './SummaryCards.vue'
import ThisMonthCard from './ThisMonthCard.vue'
import TransactionFeed from './TransactionFeed.vue'
import TodoStrip from './TodoStrip.vue'
import RecentActivity from './RecentActivity.vue'
import type { Transaction } from '../types/transaction'

defineProps<{ freshStart?: boolean }>()
const emit = defineEmits<{
  openPeople: []
  openInsights: []
  openActivityList: []
  openTodos: []
  edit: [transaction: Transaction]
  dismissFreshStart: []
}>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <div
      v-if="freshStart"
      class="mx-5 mt-3 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
      style="background: var(--accent-surface); border: 1px solid var(--accent-surface-line); color: var(--text)"
    >
      <span>Fresh start — your data has been cleared.</span>
      <button type="button" aria-label="Dismiss" style="color: var(--text-dim)" @click="emit('dismissFreshStart')">
        ✕
      </button>
    </div>
    <WalletSwitcher />
    <BalanceHero />
    <SummaryCards @open-people="emit('openPeople')" />
    <ThisMonthCard @open-insights="emit('openInsights')" />
    <TransactionFeed @edit="emit('edit', $event)" />
    <TodoStrip @open="emit('openTodos')" />
    <RecentActivity @see-all="emit('openActivityList')" @edit="emit('edit', $event)" />
  </div>
</template>
