<script setup lang="ts">
import { ref } from 'vue'
import { useWallets } from '../composables/useWallets'
import type { Wallet } from '../types/wallet'

const { wallets, activeWalletId, addWallet, removeWallet } = useWallets()

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
        @click="activeWalletId = 'all'"
        class="shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap"
        :style="
          activeWalletId === 'all'
            ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
            : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
        "
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
        <button @click="activeWalletId = w.id" class="text-xs pl-3 py-1.5" :class="w.isDefault ? 'pr-3' : 'pr-1'">
          {{ w.name }}
        </button>
        <button
          v-if="!w.isDefault"
          @click="openDeleteWallet(w)"
          aria-label="Delete wallet"
          class="text-xs w-6 h-6 flex items-center justify-center shrink-0 opacity-70"
        >
          ×
        </button>
      </div>
      <button
        @click="openAddWallet"
        aria-label="Add wallet"
        class="shrink-0 text-xs w-7 h-7 flex items-center justify-center rounded-full border"
        style="border-color: var(--ink-line); color: var(--paper-dim)"
      >
        +
      </button>
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
            @click="showAddWallet = false"
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--ink-line); color: var(--paper)"
          >
            Cancel
          </button>
          <button
            @click="confirmAddWallet"
            :disabled="adding"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--ink)"
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
            @click="pendingDelete = null"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style="border-color: var(--ink-line); color: var(--paper)"
          >
            Cancel
          </button>
          <button
            @click="confirmDeleteWallet"
            :disabled="deleting"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style="background: var(--money-out); color: var(--ink)"
          >
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
