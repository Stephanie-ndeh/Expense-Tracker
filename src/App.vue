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
import { useSettings } from './composables/useSettings'
import { useLedger } from './composables/useLedger'

type View = 'home' | 'activity' | 'trends'
const view = ref<View>('home')

const showAdd = ref(false)
const showSettings = ref(false)
const showPeople = ref(false)
const { settings } = useSettings()
const { exportData, importData } = useLedger()

const importFile = ref<HTMLInputElement | null>(null)
const importMessage = ref('')

function downloadBackup() {
  const blob = new Blob([exportData()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `big-steph-ledger-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
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
    importData(text, 'merge')
    importMessage.value = 'Backup imported.'
  } catch {
    importMessage.value = "Couldn't read that file — is it a Ledger backup?"
  } finally {
    if (importFile.value) importFile.value.value = ''
  }
}
</script>

<template>
  <AllActivityView v-if="view === 'activity'" @back="view = 'home'" />
  <TrendsView v-else-if="view === 'trends'" @back="view = 'home'" />

  <div v-else class="min-h-screen pb-28" style="background: var(--ink); color: var(--paper)">
    <header class="flex items-center justify-between px-5 pt-5">
      <p class="text-sm font-semibold tracking-tight">Big Steph</p>
      <button @click="showSettings = true" class="text-xs" style="color: var(--paper-dim)">{{ settings.currency }} ⚙</button>
    </header>

    <WalletTabs />
    <BalanceHero />
    <SummaryCards @open-people="showPeople = true" />
    <TrendChart @open-trends="view = 'trends'" />
    <TransactionFeed />
    <RecentActivity @see-all="view = 'activity'" />

    <button
      @click="showAdd = true"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full font-medium text-sm shadow-lg"
      style="background: var(--accent); color: var(--ink)"
    >
      + Add entry
    </button>

    <AddEntry v-if="showAdd" @close="showAdd = false" />
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
          />
        </label>

        <div class="border-t pt-4 mt-4" style="border-color: var(--ink-line)">
          <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Backup</span>
          <p class="text-xs mt-1 mb-3" style="color: var(--paper-dim)">
            Your data only lives on this device. Export it now and then so you never lose it.
          </p>
          <div class="flex gap-2">
            <button
              @click="downloadBackup"
              class="flex-1 py-2 rounded-lg text-xs font-medium border"
              style="border-color: var(--ink-line); color: var(--paper)"
            >
              Export backup
            </button>
            <button
              @click="triggerImport"
              class="flex-1 py-2 rounded-lg text-xs font-medium border"
              style="border-color: var(--ink-line); color: var(--paper)"
            >
              Import backup
            </button>
          </div>
          <input ref="importFile" type="file" accept="application/json" class="hidden" @change="handleImportFile" />
          <p v-if="importMessage" class="text-xs mt-2" style="color: var(--accent)">{{ importMessage }}</p>
        </div>

        <button @click="showSettings = false" class="w-full mt-5 py-2.5 rounded-xl text-sm font-medium" style="background: var(--accent); color: var(--ink)">Done</button>
      </div>
    </div>
  </div>
</template>
