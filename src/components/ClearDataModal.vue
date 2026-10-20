<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSync } from '../composables/useSync'

const emit = defineEmits<{ cleared: []; cancel: [] }>()
const { exportData } = useLedger()
const { clearAllData } = useSync()

const confirmText = ref('')
const clearing = ref(false)
const error = ref('')

// JSON, not CSV: this is the one backup format Import JSON (Me → Advanced backup) can
// actually restore. CSV is a one-way, human-readable export — no use as a safety net
// right before an irreversible wipe.
function downloadBackup() {
  const json = exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reckon-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function confirmClear() {
  if (confirmText.value.trim() !== 'DELETE') return
  clearing.value = true
  error.value = ''
  try {
    await clearAllData()
    emit('cleared')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not clear your data'
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-6">
    <div class="absolute inset-0 bg-black/60" @click="emit('cancel')" />
    <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
      <h2 class="text-sm font-semibold mb-1" style="color: var(--warn-text)">Clear all data?</h2>
      <p class="text-sm mb-3" style="color: var(--text-dim)">
        This permanently deletes every transaction, to-do, person, and category — and any wallet besides your default
        one. Your default wallet and sign-in stay, with the default categories re-added. This can't be undone.
      </p>

      <button
        type="button"
        class="w-full py-2 mb-4 rounded-lg text-xs font-medium border"
        style="border-color: var(--line); color: var(--text)"
        @click="downloadBackup"
      >
        Download JSON backup first
      </button>

      <label class="block mb-3">
        <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)"> Type "DELETE" to confirm </span>
        <input
          v-model="confirmText"
          type="text"
          placeholder="DELETE"
          autocomplete="off"
          autocapitalize="off"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--bg); border-color: var(--line); color: var(--text)"
          @keyup.enter="confirmClear"
        />
      </label>

      <p v-if="error" class="text-xs mb-3" style="color: var(--warn-text)">{{ error }}</p>

      <div class="flex gap-2">
        <button
          class="flex-1 py-2.5 rounded-xl text-sm font-medium border"
          style="border-color: var(--line); color: var(--text)"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          :disabled="confirmText.trim() !== 'DELETE' || clearing"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          style="background: var(--money-out); color: var(--bg)"
          @click="confirmClear"
        >
          {{ clearing ? 'Clearing…' : 'Clear everything' }}
        </button>
      </div>
    </div>
  </div>
</template>
