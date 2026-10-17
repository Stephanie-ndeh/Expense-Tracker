<script setup lang="ts">
import { ref } from 'vue'
import { useRecurring } from '../composables/useRecurring'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'
import { TYPE_META } from '../types/transaction'

const emit = defineEmits<{ close: [] }>()
const { rules, setPaused, removeRule } = useRecurring()
const { format } = useSettings()
const { wallets } = useWallets()

function walletName(id: string) {
  return wallets.value.find((w) => w.id === id)?.name ?? ''
}

const busyId = ref<string | null>(null)
const error = ref('')

async function toggle(id: string, paused: boolean) {
  error.value = ''
  busyId.value = id
  try {
    await setPaused(id, !paused)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    busyId.value = null
  }
}

const pendingDelete = ref<string | null>(null)

async function confirmDelete() {
  if (!pendingDelete.value) return
  error.value = ''
  busyId.value = pendingDelete.value
  try {
    await removeRule(pendingDelete.value)
    pendingDelete.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
    <div
      class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto"
      style="background: var(--ink-raised)"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Recurring entries</h2>
        <button class="text-sm" style="color: var(--paper-dim)" @click="emit('close')">Close</button>
      </div>

      <p v-if="!rules.length" class="text-sm py-6 text-center" style="color: var(--paper-dim)">
        No recurring entries yet — turn on "Repeat" when adding an entry.
      </p>
      <p v-if="error" class="text-xs mb-3" style="color: var(--money-out)">{{ error }}</p>

      <div
        v-for="r in rules"
        :key="r.id"
        class="flex items-center justify-between py-3 border-b"
        style="border-color: var(--ink-line)"
      >
        <div class="min-w-0">
          <p class="text-sm truncate" :style="{ color: r.paused ? 'var(--paper-dim)' : 'var(--paper)' }">
            {{ r.label }} · {{ format(r.amount) }}
          </p>
          <p class="text-xs capitalize" style="color: var(--paper-dim)">
            {{ TYPE_META[r.type].verb }} · {{ r.frequency }} · {{ walletName(r.walletId)
            }}<template v-if="r.paused"> · Paused</template>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0 pl-3">
          <button
            :disabled="busyId === r.id"
            class="text-xs px-2 py-1 rounded-md border disabled:opacity-50"
            style="border-color: var(--ink-line); color: var(--paper)"
            @click="toggle(r.id, r.paused)"
          >
            {{ r.paused ? 'Resume' : 'Pause' }}
          </button>
          <button
            :disabled="busyId === r.id"
            class="text-xs px-2 py-1 rounded-md disabled:opacity-50"
            style="background: var(--money-out); color: var(--ink)"
            @click="pendingDelete = r.id"
          >
            Delete
          </button>
        </div>
      </div>

      <div v-if="pendingDelete" class="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div class="absolute inset-0 bg-black/60" @click="pendingDelete = null" />
        <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--ink-raised)">
          <h2 class="text-sm font-semibold mb-1">Delete this recurring entry?</h2>
          <p class="text-sm mb-4" style="color: var(--paper-dim)">
            Entries it already created stay — only future ones stop.
          </p>
          <div class="flex gap-2">
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-medium border"
              style="border-color: var(--ink-line); color: var(--paper)"
              @click="pendingDelete = null"
            >
              Cancel
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style="background: var(--money-out); color: var(--ink)"
              @click="confirmDelete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
