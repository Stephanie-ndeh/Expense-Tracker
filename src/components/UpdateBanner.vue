<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // iOS home-screen apps never check for updates in the background,
    // so poll while the app is actually open.
    setInterval(() => registration.update(), 60 * 60 * 1000)
  },
})
</script>

<template>
  <div
    v-if="needRefresh"
    class="fixed inset-x-0 bottom-0 z-[70] flex items-center justify-between gap-3 px-5 py-3"
    style="background: var(--ink-raised); border-top: 1px solid var(--ink-line)"
  >
    <p class="text-xs" style="color: var(--paper)">A new version is ready.</p>
    <button
      @click="updateServiceWorker(true)"
      class="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
      style="background: var(--accent); color: var(--ink)"
    >
      Reload
    </button>
  </div>
</template>
