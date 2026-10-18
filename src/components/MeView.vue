<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWallets } from '../composables/useWallets'
import { useSettings } from '../composables/useSettings'
import { useLedger } from '../composables/useLedger'
import { useCategories } from '../composables/useCategories'
import { usePeople } from '../composables/usePeople'
import { useAuth } from '../composables/useAuth'
import { useSync } from '../composables/useSync'
import type { Wallet } from '../types/wallet'

const emit = defineEmits<{ openAppearance: []; openPro: []; openPeople: [] }>()

const { wallets, addWallet, renameWallet, removeWallet } = useWallets()
const { settings, updateCurrency, format } = useSettings()
const { exportData, exportCsv, importData, pendingSyncCount, balanceForWallet } = useLedger()
const { categories } = useCategories()
const { people } = usePeople()
const { enabled: syncEnabled, userEmail, signOut } = useAuth()
const { syncing, lastSyncedAt, error: syncError, queueError, syncNow } = useSync()

const displayName = computed(() => {
  const local = userEmail.value?.split('@')[0] ?? 'You'
  return local.charAt(0).toUpperCase() + local.slice(1)
})

const currencyError = ref('')
async function saveCurrency() {
  currencyError.value = ''
  try {
    await updateCurrency(settings.currency)
  } catch (e) {
    currencyError.value = e instanceof Error ? e.message : 'Could not save currency.'
  }
}

function lastSyncedLabel() {
  if (!lastSyncedAt.value) return 'Not synced yet'
  const mins = Math.round((Date.now() - lastSyncedAt.value) / 60000)
  if (mins < 1) return 'Synced just now'
  if (mins < 60) return `Synced ${mins}m ago`
  return `Synced ${Math.round(mins / 60)}h ago`
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

const showAddWallet = ref(false)
const newWalletName = ref('')
const addError = ref('')
const adding = ref(false)

function openAddWallet() {
  newWalletName.value = ''
  addError.value = ''
  showAddWallet.value = true
}

async function confirmAddWallet() {
  const name = newWalletName.value.trim()
  if (!name) return
  addError.value = ''
  adding.value = true
  try {
    await addWallet(name)
    showAddWallet.value = false
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    adding.value = false
  }
}

const pendingRename = ref<Wallet | null>(null)
const renameValue = ref('')
const renameError = ref('')
const renaming = ref(false)

function openRenameWallet(w: Wallet) {
  pendingRename.value = w
  renameValue.value = w.name
  renameError.value = ''
}

async function confirmRenameWallet() {
  if (!pendingRename.value) return
  renameError.value = ''
  renaming.value = true
  try {
    await renameWallet(pendingRename.value.id, renameValue.value)
    pendingRename.value = null
  } catch (e) {
    renameError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    renaming.value = false
  }
}

const pendingDelete = ref<Wallet | null>(null)
const deleteError = ref('')
const deleting = ref(false)

function openDeleteWallet(w: Wallet) {
  deleteError.value = ''
  pendingDelete.value = w
}

async function confirmDeleteWallet() {
  if (!pendingDelete.value) return
  deleteError.value = ''
  deleting.value = true
  try {
    await removeWallet(pendingDelete.value.id)
    pendingDelete.value = null
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="pb-10 px-5" style="background: var(--bg); color: var(--text); min-height: 100vh">
    <div class="flex items-center gap-3.5 pt-5" style="min-height: 56px">
      <span
        class="rounded-full flex items-center justify-center shrink-0"
        style="
          width: 52px;
          height: 52px;
          background: var(--accent);
          color: var(--on-accent);
          font-size: 20px;
          font-weight: 800;
        "
      >
        {{ displayName.charAt(0).toUpperCase() }}
      </span>
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <p class="text-lg font-extrabold truncate">{{ displayName }}</p>
        <p class="text-xs font-semibold" :style="{ color: syncEnabled ? 'var(--money-in)' : 'var(--text-dim)' }">
          <template v-if="syncEnabled"
            >● {{ syncError ? 'Sync error' : syncing ? 'Syncing…' : lastSyncedLabel() }}</template
          >
          <template v-else>Local only</template>
        </p>
      </div>
      <span
        class="rounded-full px-2.5 flex items-center shrink-0 text-xs font-bold border"
        style="height: 26px; border-color: var(--line); color: var(--text-dim)"
      >
        Free
      </span>
    </div>

    <button
      type="button"
      class="w-full flex items-center gap-3 rounded-2xl px-4 mt-5 text-left"
      style="min-height: 64px; background: var(--accent); color: var(--on-accent)"
      @click="emit('openPro')"
    >
      <div class="flex-1 min-w-0 flex flex-col gap-0.5 py-3">
        <p class="text-sm font-extrabold">Upgrade to Reckon Pro</p>
        <p class="text-xs font-semibold" style="color: var(--on-accent); opacity: 0.7">
          Recurring entries, safe-to-spend, shared wallets
        </p>
      </div>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0"
        aria-hidden="true"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>

    <section class="flex flex-col gap-2 mt-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold" style="color: var(--text-dim); letter-spacing: 0.3px">Wallets</h2>
        <button type="button" class="text-xs font-bold" style="color: var(--accent-text)" @click="openAddWallet">
          + Add wallet
        </button>
      </div>
      <div class="rounded-2xl border overflow-hidden" style="background: var(--surface); border-color: var(--line)">
        <div
          v-for="(w, i) in wallets"
          :key="w.id"
          class="flex items-center gap-3 px-3"
          :style="{ minHeight: '60px', borderBottom: i < wallets.length - 1 ? '1px solid var(--line)' : 'none' }"
        >
          <span
            class="rounded-xl flex items-center justify-center shrink-0"
            style="
              width: 34px;
              height: 34px;
              background: var(--accent);
              color: var(--on-accent);
              font-size: 13px;
              font-weight: 800;
            "
          >
            {{ w.name.charAt(0).toUpperCase() }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ w.name }}</p>
            <p class="text-xs" style="color: var(--text-dim)">
              <template v-if="w.isDefault">Default · </template>{{ format(balanceForWallet(w.id)) }}
            </p>
          </div>
          <button
            aria-label="Rename wallet"
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style="color: var(--text-dim)"
            @click="openRenameWallet(w)"
          >
            ✎
          </button>
          <button
            v-if="!w.isDefault"
            aria-label="Delete wallet"
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style="color: var(--warn-text)"
            @click="openDeleteWallet(w)"
          >
            ✕
          </button>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2 mt-6">
      <h2 class="text-xs font-bold" style="color: var(--text-dim); letter-spacing: 0.3px">Currency</h2>
      <div class="rounded-2xl border p-4" style="background: var(--surface); border-color: var(--line)">
        <input
          v-model="settings.currency"
          type="text"
          class="w-full rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--bg); border-color: var(--line); color: var(--text)"
          @change="saveCurrency"
        />
        <p v-if="currencyError" class="text-xs mt-2" style="color: var(--warn-text)">{{ currencyError }}</p>
      </div>
    </section>

    <section class="flex flex-col gap-2 mt-6">
      <h2 class="text-xs font-bold" style="color: var(--text-dim); letter-spacing: 0.3px">Money setup</h2>
      <div class="rounded-2xl border overflow-hidden" style="background: var(--surface); border-color: var(--line)">
        <div class="flex items-center gap-3 px-3.5" style="min-height: 52px; border-bottom: 1px solid var(--line)">
          <span class="flex-1 text-sm font-semibold">Categories</span>
          <span class="text-[13px]" style="color: var(--text-dim)">{{ categories.length }}</span>
        </div>
        <button
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          style="min-height: 52px"
          @click="emit('openPeople')"
        >
          <span class="flex-1 text-sm font-semibold">People</span>
          <span class="text-[13px]" style="color: var(--text-dim)">{{ people.length }}</span>
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
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-2 mt-6">
      <h2 class="text-xs font-bold" style="color: var(--text-dim); letter-spacing: 0.3px">App &amp; account</h2>
      <div class="rounded-2xl border overflow-hidden" style="background: var(--surface); border-color: var(--line)">
        <button
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          style="min-height: 52px; border-bottom: 1px solid var(--line)"
          @click="emit('openAppearance')"
        >
          <span class="flex-1 text-sm font-semibold">Appearance</span>
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
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>

        <button
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          style="min-height: 52px; border-bottom: 1px solid var(--line)"
          @click="downloadCsv"
        >
          <span class="flex-1 text-sm font-semibold">Export to CSV</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
        </button>

        <button
          v-if="syncEnabled"
          type="button"
          :disabled="syncing"
          class="w-full flex items-center gap-3 px-3.5 text-left disabled:opacity-50"
          style="min-height: 52px; border-bottom: 1px solid var(--line)"
          @click="syncNow"
        >
          <span class="flex-1 text-sm font-semibold">Sync now</span>
          <span v-if="pendingSyncCount" class="text-[13px]" style="color: var(--accent-text)">
            {{ pendingSyncCount }} pending
          </span>
        </button>

        <button
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          style="min-height: 52px; color: var(--warn-text)"
          @click="signOut"
        >
          <span class="flex-1 text-sm font-semibold">Sign out</span>
        </button>
      </div>

      <p v-if="queueError" class="text-xs" style="color: var(--warn-text)">{{ queueError }}</p>

      <details class="mt-1">
        <summary class="text-xs cursor-pointer select-none" style="color: var(--text-dim)">Advanced backup</summary>
        <div class="flex gap-2 mt-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="downloadBackup"
          >
            Export JSON
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="triggerImport"
          >
            Import JSON
          </button>
        </div>
      </details>
      <input ref="importFile" type="file" accept="application/json" class="hidden" @change="handleImportFile" />
      <p v-if="importMessage" class="text-xs" style="color: var(--accent-text)">{{ importMessage }}</p>
    </section>

    <div v-if="pendingRename" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="pendingRename = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-3">Rename wallet</h2>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Name</span>
          <input
            v-model="renameValue"
            type="text"
            autofocus
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
            @keyup.enter="confirmRenameWallet"
          />
        </label>

        <p v-if="renameError" class="text-xs mb-3" style="color: var(--warn-text)">{{ renameError }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="pendingRename = null"
          >
            Cancel
          </button>
          <button
            :disabled="renaming"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--on-accent)"
            @click="confirmRenameWallet"
          >
            {{ renaming ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddWallet" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="showAddWallet = false" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-3">New wallet</h2>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Name</span>
          <input
            v-model="newWalletName"
            type="text"
            autofocus
            placeholder="e.g. Business"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
            @keyup.enter="confirmAddWallet"
          />
        </label>

        <p v-if="addError" class="text-xs mb-3" style="color: var(--warn-text)">{{ addError }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="showAddWallet = false"
          >
            Cancel
          </button>
          <button
            :disabled="adding"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--on-accent)"
            @click="confirmAddWallet"
          >
            {{ adding ? 'Adding…' : 'Add wallet' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="pendingDelete" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="pendingDelete = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-1">Delete "{{ pendingDelete.name }}"?</h2>
        <p class="text-sm mb-4" style="color: var(--text-dim)">This can't be undone.</p>

        <p v-if="deleteError" class="text-xs mb-3" style="color: var(--warn-text)">{{ deleteError }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="pendingDelete = null"
          >
            Cancel
          </button>
          <button
            :disabled="deleting"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--money-out); color: var(--bg)"
            @click="confirmDeleteWallet"
          >
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
