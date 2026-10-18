<script setup lang="ts">
import { ref } from 'vue'
import HomeView from './components/HomeView.vue'
import AddEntry from './components/AddEntry.vue'
import PeopleView from './components/PeopleView.vue'
import ActivityView from './components/ActivityView.vue'
import TodosView from './components/TodosView.vue'
import MeView from './components/MeView.vue'
import AppearanceView from './components/AppearanceView.vue'
import ProView from './components/ProView.vue'
import CategoriesView from './components/CategoriesView.vue'
import BottomNav from './components/BottomNav.vue'
import UpdateBanner from './components/UpdateBanner.vue'
import AuthGate from './components/AuthGate.vue'
import ResetPasswordView from './components/ResetPasswordView.vue'
import { useAuth } from './composables/useAuth'
import { useTodos } from './composables/useTodos'
import type { Transaction, TransactionType } from './types/transaction'

type NavView = 'home' | 'activity' | 'todos' | 'me'
type View = NavView | 'appearance' | 'pro' | 'categories'
const view = ref<View>('home')
const activityTab = ref<'list' | 'insights'>('list')

const showAdd = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const todoPrefill = ref<{ type?: TransactionType; amount?: number; label?: string; walletId?: string } | null>(null)
const showPeople = ref(false)

const { enabled: syncEnabled, loading: authLoading, isAuthenticated, passwordRecovery } = useAuth()
const { overdueCount } = useTodos()

function closeAddEntry() {
  showAdd.value = false
  editingTransaction.value = null
  todoPrefill.value = null
}

function openActivity(tab: 'list' | 'insights') {
  activityTab.value = tab
  view.value = 'activity'
}

function navigate(v: NavView) {
  if (v === 'activity') activityTab.value = 'list'
  view.value = v
}
</script>

<template>
  <UpdateBanner />

  <div v-if="syncEnabled && authLoading" class="min-h-screen" style="background: var(--bg)" />
  <ResetPasswordView v-else-if="syncEnabled && passwordRecovery" />
  <AuthGate v-else-if="syncEnabled && !isAuthenticated" />

  <template v-else>
    <AppearanceView v-if="view === 'appearance'" @back="view = 'me'" />
    <ProView v-else-if="view === 'pro'" @back="view = 'me'" />
    <CategoriesView v-else-if="view === 'categories'" @back="view = 'me'" />

    <template v-else>
      <div class="pb-28" style="background: var(--bg); color: var(--text); min-height: 100vh">
        <HomeView
          v-if="view === 'home'"
          @open-people="showPeople = true"
          @open-insights="openActivity('insights')"
          @open-activity-list="openActivity('list')"
          @open-todos="view = 'todos'"
          @edit="editingTransaction = $event"
        />

        <ActivityView v-else-if="view === 'activity'" :initial-tab="activityTab" @edit="editingTransaction = $event" />

        <TodosView v-else-if="view === 'todos'" @log="todoPrefill = $event" />

        <MeView
          v-else-if="view === 'me'"
          @open-appearance="view = 'appearance'"
          @open-pro="view = 'pro'"
          @open-people="showPeople = true"
          @open-categories="view = 'categories'"
        />
      </div>

      <BottomNav :active="view" :overdue-count="overdueCount" @navigate="navigate" @add="showAdd = true" />

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
