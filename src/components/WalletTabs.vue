<script setup lang="ts">
import { ref } from 'vue'
import { useWallets } from '../composables/useWallets'
import type { Wallet } from '../types/wallet'

const { wallets, activeWalletId, addWallet, renameWallet, removeWallet } = useWallets()

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
  <div class="px-5 pt-3">
    <div class="flex gap-2 overflow-x-auto" style="scrollbar-width: none">
      <button
        class="shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap"
        :style="
          activeWalletId === 'all'
            ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
            : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
        "
        @click="activeWalletId = 'all'"
      >
        All
      </button>
      <div
        v-for="w in wallets"
        :key="w.id"
        class="shrink-0 flex items-center rounded-full border whitespace-nowrap overflow-hidden"
        :style="
          activeWalletId === w.id
            ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
            : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
        "
      >
        <button class="text-xs pl-3 py-1.5 pr-1" @click="activeWalletId = w.id">
          {{ w.name }}
        </button>
        <button
          aria-label="Rename wallet"
          class="text-xs w-6 h-6 flex items-center justify-center shrink-0 opacity-70"
          :class="w.isDefault ? 'pr-2' : ''"
          @click="openRenameWallet(w)"
        >
          ✎
        </button>
        <button
          v-if="!w.isDefault"
          aria-label="Delete wallet"
          class="text-xs w-6 h-6 flex items-center justify-center shrink-0 opacity-70 pr-2"
          @click="openDeleteWallet(w)"
        >
          ×
        </button>
      </div>
      <button
        aria-label="Add wallet"
        class="shrink-0 text-xs w-7 h-7 flex items-center justify-center rounded-full border"
        style="border-color: var(--ink-line); color: var(--paper-dim)"
        @click="openAddWallet"
      >
        +
      </button>
    </div>

    <div v-if="pendingRename" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="pendingRename = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--ink-raised)">
        <h2 class="text-sm font-semibold mb-3">Rename wallet</h2>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Name</span>
          <input
            v-model="renameValue"
            type="text"
            autofocus
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
            @keyup.enter="confirmRenameWallet"
          />
        </label>

        <p v-if="renameError" class="text-xs mb-3" style="color: var(--money-out)">{{ renameError }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--ink-line); color: var(--paper)"
            @click="pendingRename = null"
          >
            Cancel
          </button>
          <button
            :disabled="renaming"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--ink)"
            @click="confirmRenameWallet"
          >
            {{ renaming ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddWallet" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="showAddWallet = false" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--ink-raised)">
        <h2 class="text-sm font-semibold mb-3">New wallet</h2>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Name</span>
          <input
            v-model="newWalletName"
            type="text"
            autofocus
            placeholder="e.g. Business"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
            @keyup.enter="confirmAddWallet"
          />
        </label>

        <p v-if="addError" class="text-xs mb-3" style="color: var(--money-out)">{{ addError }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--ink-line); color: var(--paper)"
            @click="showAddWallet = false"
          >
            Cancel
          </button>
          <button
            :disabled="adding"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--ink)"
            @click="confirmAddWallet"
          >
            {{ adding ? 'Adding…' : 'Add wallet' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="pendingDelete" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="pendingDelete = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--ink-raised)">
        <h2 class="text-sm font-semibold mb-1">Delete "{{ pendingDelete.name }}"?</h2>
        <p class="text-sm mb-4" style="color: var(--paper-dim)">This can't be undone.</p>

        <p v-if="deleteError" class="text-xs mb-3" style="color: var(--money-out)">{{ deleteError }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style="border-color: var(--ink-line); color: var(--paper)"
            @click="pendingDelete = null"
          >
            Cancel
          </button>
          <button
            :disabled="deleting"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style="background: var(--money-out); color: var(--ink)"
            @click="confirmDeleteWallet"
          >
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
