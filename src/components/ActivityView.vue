<script setup lang="ts">
import { ref } from 'vue'
import AllActivityView from './AllActivityView.vue'
import TrendsView from './TrendsView.vue'
import type { Transaction } from '../types/transaction'

const props = defineProps<{ initialTab?: 'list' | 'insights' }>()
const emit = defineEmits<{ edit: [transaction: Transaction] }>()

const activityTab = ref<'list' | 'insights'>(props.initialTab ?? 'list')
</script>

<template>
  <div>
    <header class="px-5 pt-5 pb-3 flex items-center justify-between" style="min-height: 44px">
      <h1 class="text-[26px] font-extrabold tracking-tight">Activity</h1>
      <div class="flex p-[3px] rounded-xl" style="background: var(--surface); border: 1px solid var(--line)">
        <button
          type="button"
          class="px-3 py-2 rounded-[9px] text-[13px]"
          :style="
            activityTab === 'list'
              ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 700 }
              : { color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="activityTab = 'list'"
        >
          List
        </button>
        <button
          type="button"
          class="px-3 py-2 rounded-[9px] text-[13px]"
          :style="
            activityTab === 'insights'
              ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 700 }
              : { color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="activityTab = 'insights'"
        >
          Insights
        </button>
      </div>
    </header>

    <AllActivityView v-if="activityTab === 'list'" @edit="emit('edit', $event)" />
    <TrendsView v-else />
  </div>
</template>
