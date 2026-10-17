<script setup lang="ts">
import { ref } from 'vue'
import BalanceHero from './components/BalanceHero.vue'
import SummaryCards from './components/SummaryCards.vue'
import TrendChart from './components/TrendChart.vue'
import TransactionFeed from './components/TransactionFeed.vue'
import RecentActivity from './components/RecentActivity.vue'
import AddEntry from './components/AddEntry.vue'
import WalletTabs from './components/WalletTabs.vue'
import PeopleView from './components/PeopleView.vue'
import AllActivityView from './components/AllActivityView.vue'
import TrendsView from './components/TrendsView.vue'
import TodosView from './components/TodosView.vue'
import UpcomingTodos from './components/UpcomingTodos.vue'
import UpdateBanner from './components/UpdateBanner.vue'
import AuthGate from './components/AuthGate.vue'
import { useSettings } from './composables/useSettings'
import { useLedger } from './composables/useLedger'
import { useAuth } from './composables/useAuth'
import { useSync } from './composables/useSync'
import type { Transaction, TransactionType } from './types/transaction'

type View = 'home' | 'activity' | 'trends' | 'todos'
const view = ref<View>('home')

const showAdd = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const todoPrefill = ref<{ type?: TransactionType; amount?: number; label?: string; walletId?: string } | null>(null)
const showSettings = ref(false)
const showPeople = ref(false)
const { settings, updateCurrency } = useSettings()
const currencyError = ref('')

async function saveCurrency() {
  currencyError.value = ''
  try {
    await updateCurrency(settings.currency)
  } catch (e) {
    currencyError.value = e instanceof Error ? e.message : 'Could not save currency.'
  }
}
const { exportData, exportCsv, importData } = useLedger()
const { enabled: syncEnabled, loading: authLoading, isAuthenticated, userEmail, signOut } = useAuth()
const { syncing, lastSyncedAt, error: syncError, syncNow } = useSync()

function lastSyncedLabel() {
  if (!lastSyncedAt.value) return 'Not synced yet'
  const mins = Math.round((Date.now() - lastSyncedAt.value) / 60000)
  if (mins < 1) return 'Synced just now'
  if (mins < 60) return `Synced ${mins}m ago`
  return `Synced ${Math.round(mins / 60)}h ago`
}

function closeAddEntry() {
  showAdd.value = false
  editingTransaction.value = null
  todoPrefill.value = null
}

const importFile = ref<HTMLInputElement | null>(null)
const importMessage = ref('')

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCsv() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(exportCsv(), 'text/csv', `reckon-backup-${stamp}.csv`)
}

function downloadBackup() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(exportData(), 'application/json', `reckon-backup-${stamp}.json`)
}

function triggerImport() {
  importMessage.value = ''
  importFile.value?.click()
}

async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    await importData(text)
    importMessage.value = 'Backup imported.'
  } catch (err) {
    importMessage.value = err instanceof Error ? err.message : "Couldn't read that file — is it a backup?"
  } finally {
    if (importFile.value) importFile.value.value = ''
  }
}
</script>

<template>
  <UpdateBanner />

  <div v-if="syncEnabled && authLoading" class="min-h-screen" style="background: var(--ink)" />
  <AuthGate v-else-if="syncEnabled && !isAuthenticated" />

  <template v-else>
    <AllActivityView v-if="view === 'activity'" @back="view = 'home'" @edit="editingTransaction = $event" />
    <TrendsView v-else-if="view === 'trends'" @back="view = 'home'" />
    <TodosView v-else-if="view === 'todos'" @back="view = 'home'" @log="todoPrefill = $event" />

    <div v-else class="min-h-screen pb-28" style="background: var(--ink); color: var(--paper)">
      <header class="flex items-center justify-between px-5 pt-5">
        <p class="text-sm font-semibold tracking-tight">Reckon</p>
        <button class="text-xs" style="color: var(--paper-dim)" @click="showSettings = true">
          {{ settings.currency }} ⚙
        </button>
      </header>

      <WalletTabs />
      <BalanceHero />
      <SummaryCards @open-people="showPeople = true" />
      <TrendChart @open-trends="view = 'trends'" />
      <TransactionFeed @edit="editingTransaction = $event" />
      <UpcomingTodos @see-all="view = 'todos'" @log="todoPrefill = $event" />
      <RecentActivity @see-all="view = 'activity'" @edit="editingTransaction = $event" />

      <button
        class="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full font-medium text-sm shadow-lg"
        style="background: var(--accent); color: var(--ink)"
        @click="showAdd = true"
      >
        + Add entry
      </button>

      <PeopleView v-if="showPeople" @close="showPeople = false" />

      <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div class="absolute inset-0 bg-black/60" @click="showSettings = false" />
        <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--ink-raised)">
          <h2 class="text-sm font-semibold mb-3">Settings</h2>

          <label class="block mb-4">
            <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Currency label</span>
            <input
              v-model="settings.currency"
              type="text"
              class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
              @change="saveCurrency"
            />
          </label>
          <p v-if="currencyError" class="text-xs -mt-3 mb-4" style="color: var(--money-out)">{{ currencyError }}</p>

          <div v-if="syncEnabled" class="border-t pt-4 mt-4" style="border-color: var(--ink-line)">
            <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Sync</span>
            <p class="text-xs mt-1" style="color: var(--paper-dim)">{{ userEmail }}</p>
            <p class="text-xs mt-1" :style="{ color: syncError ? 'var(--money-out)' : 'var(--paper-dim)' }">
              {{ syncError ? `Sync error: ${syncError}` : syncing ? 'Syncing…' : lastSyncedLabel() }}
            </p>
            <div class="flex gap-2 mt-3">
              <button
                :disabled="syncing"
                class="flex-1 py-2 rounded-lg text-xs font-medium border disabled:opacity-50"
                style="border-color: var(--ink-line); color: var(--paper)"
                @click="syncNow"
              >
                Sync now
              </button>
              <button
                class="flex-1 py-2 rounded-lg text-xs font-medium border"
                style="border-color: var(--ink-line); color: var(--paper)"
                @click="signOut"
              >
                Sign out
              </button>
            </div>
          </div>

          <div class="border-t pt-4 mt-4" style="border-color: var(--ink-line)">
            <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Backup</span>
            <p class="text-xs mt-1 mb-3" style="color: var(--paper-dim)">
              {{
                syncEnabled
                  ? 'Your data syncs to your account, but a local export is still a good habit before switching devices.'
                  : 'Your data only lives on this device. Export it now and then so you never lose it.'
              }}
            </p>
            <button
              class="w-full py-2 rounded-lg text-xs font-medium border"
              style="border-color: var(--ink-line); color: var(--paper)"
              @click="downloadCsv"
            >
              Export backup (CSV)
            </button>

            <details class="mt-3">
              <summary class="text-xs cursor-pointer select-none" style="color: var(--paper-dim)">Advanced</summary>
              <div class="flex gap-2 mt-2">
                <button
                  class="flex-1 py-2 rounded-lg text-xs font-medium border"
                  style="border-color: var(--ink-line); color: var(--paper)"
                  @click="downloadBackup"
                >
                  Export JSON
                </button>
                <button
                  class="flex-1 py-2 rounded-lg text-xs font-medium border"
                  style="border-color: var(--ink-line); color: var(--paper)"
                  @click="triggerImport"
                >
                  Import JSON
                </button>
              </div>
            </details>
            <input ref="importFile" type="file" accept="application/json" class="hidden" @change="handleImportFile" />
            <p v-if="importMessage" class="text-xs mt-2" style="color: var(--accent)">{{ importMessage }}</p>
          </div>

          <button
            class="w-full mt-5 py-2.5 rounded-xl text-sm font-medium"
            style="background: var(--accent); color: var(--ink)"
            @click="showSettings = false"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <AddEntry
      v-if="showAdd || editingTransaction || todoPrefill"
      :editing="editingTransaction"
      :prefill="todoPrefill"
      @close="closeAddEntry"
    />
  </template>
</template>
