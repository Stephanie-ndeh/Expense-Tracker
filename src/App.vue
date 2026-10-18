<script setup lang="ts">
import { ref } from 'vue'
import BalanceHero from './components/BalanceHero.vue'
import SummaryCards from './components/SummaryCards.vue'
import TrendChart from './components/TrendChart.vue'
import TransactionFeed from './components/TransactionFeed.vue'
import RecentActivity from './components/RecentActivity.vue'
import AddEntry from './components/AddEntry.vue'
import WalletSwitcher from './components/WalletSwitcher.vue'
import PeopleView from './components/PeopleView.vue'
import AllActivityView from './components/AllActivityView.vue'
import TrendsView from './components/TrendsView.vue'
import TodosView from './components/TodosView.vue'
import UpcomingTodos from './components/UpcomingTodos.vue'
import MeView from './components/MeView.vue'
import AppearanceView from './components/AppearanceView.vue'
import BottomNav from './components/BottomNav.vue'
import UpdateBanner from './components/UpdateBanner.vue'
import AuthGate from './components/AuthGate.vue'
import { useAuth } from './composables/useAuth'
import type { Transaction, TransactionType } from './types/transaction'

type NavView = 'home' | 'activity' | 'todos' | 'me'
type View = NavView | 'appearance'
const view = ref<View>('home')
const activityTab = ref<'list' | 'insights'>('list')

const showAdd = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const todoPrefill = ref<{ type?: TransactionType; amount?: number; label?: string; walletId?: string } | null>(null)
const showPeople = ref(false)

const { enabled: syncEnabled, loading: authLoading, isAuthenticated } = useAuth()

function closeAddEntry() {
  showAdd.value = false
  editingTransaction.value = null
  todoPrefill.value = null
}

function openActivity(tab: 'list' | 'insights') {
  activityTab.value = tab
  view.value = 'activity'
}
</script>

<template>
  <UpdateBanner />

  <div v-if="syncEnabled && authLoading" class="min-h-screen" style="background: var(--bg)" />
  <AuthGate v-else-if="syncEnabled && !isAuthenticated" />

  <template v-else>
    <AppearanceView v-if="view === 'appearance'" @back="view = 'me'" />

    <template v-else>
      <div class="pb-28" style="background: var(--bg); color: var(--text); min-height: 100vh">
        <template v-if="view === 'home'">
          <WalletSwitcher />
          <BalanceHero />
          <SummaryCards @open-people="showPeople = true" />
          <TrendChart @open-trends="openActivity('insights')" />
          <TransactionFeed @edit="editingTransaction = $event" />
          <UpcomingTodos @see-all="view = 'todos'" @log="todoPrefill = $event" />
          <RecentActivity @see-all="openActivity('list')" @edit="editingTransaction = $event" />
        </template>

        <template v-else-if="view === 'activity'">
          <header class="px-5 pt-5 pb-2">
            <h1 class="text-sm font-semibold mb-3">Activity</h1>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 text-xs py-2 rounded-lg border font-medium"
                :style="
                  activityTab === 'list'
                    ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                    : { borderColor: 'var(--line)', color: 'var(--text-dim)' }
                "
                @click="activityTab = 'list'"
              >
                List
              </button>
              <button
                type="button"
                class="flex-1 text-xs py-2 rounded-lg border font-medium"
                :style="
                  activityTab === 'insights'
                    ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                    : { borderColor: 'var(--line)', color: 'var(--text-dim)' }
                "
                @click="activityTab = 'insights'"
              >
                Insights
              </button>
            </div>
          </header>
          <AllActivityView v-if="activityTab === 'list'" @edit="editingTransaction = $event" />
          <TrendsView v-else />
        </template>

        <TodosView v-else-if="view === 'todos'" @log="todoPrefill = $event" />

        <MeView v-else-if="view === 'me'" @open-appearance="view = 'appearance'" />
      </div>

      <BottomNav :active="view" @navigate="view = $event" @add="showAdd = true" />

      <PeopleView v-if="showPeople" @close="showPeople = false" />
    </template>

    <AddEntry
      v-if="showAdd || editingTransaction || todoPrefill"
      :editing="editingTransaction"
      :prefill="todoPrefill"
      @close="closeAddEntry"
    />
  </template>
</template>
