<script setup lang="ts">
import { ref } from 'vue'
import { useWallets } from '../composables/useWallets'

const { wallets, activeWalletId, addWallet } = useWallets()

const showAddWallet = ref(false)
const newWalletName = ref('')

function openAddWallet() {
  newWalletName.value = ''
  showAddWallet.value = true
}

function confirmAddWallet() {
  const name = newWalletName.value.trim()
  if (!name) return
  addWallet(name)
  showAddWallet.value = false
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
      <button
        v-for="w in wallets"
        :key="w.id"
        @click="activeWalletId = w.id"
        class="shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap"
        :style="
          activeWalletId === w.id
            ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
            : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
        "
      >
        {{ w.name }}
      </button>
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
            class="flex-1 py-2 rounded-lg text-xs font-medium"
            style="background: var(--accent); color: var(--ink)"
          >
            Add wallet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
