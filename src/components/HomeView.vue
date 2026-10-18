<script setup lang="ts">
import WalletSwitcher from './WalletSwitcher.vue'
import BalanceHero from './BalanceHero.vue'
import SummaryCards from './SummaryCards.vue'
import ThisMonthCard from './ThisMonthCard.vue'
import TransactionFeed from './TransactionFeed.vue'
import UpNext from './UpNext.vue'
import RecentActivity from './RecentActivity.vue'
import type { Transaction, TransactionType } from '../types/transaction'

const emit = defineEmits<{
  openPeople: []
  openInsights: []
  openActivityList: []
  openTodos: []
  edit: [transaction: Transaction]
  logPrefill: [prefill: { type?: TransactionType; amount?: number; label?: string; walletId?: string }]
}>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <WalletSwitcher />
    <BalanceHero />
    <SummaryCards @open-people="emit('openPeople')" />
    <ThisMonthCard @open-insights="emit('openInsights')" />
    <TransactionFeed @edit="emit('edit', $event)" />
    <UpNext @see-all="emit('openTodos')" @log="emit('logPrefill', $event)" />
    <RecentActivity @see-all="emit('openActivityList')" @edit="emit('edit', $event)" />
  </div>
</template>
