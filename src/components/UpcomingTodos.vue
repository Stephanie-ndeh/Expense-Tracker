<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTodos } from '../composables/useTodos'
import { useSettings } from '../composables/useSettings'
import type { TransactionType } from '../types/transaction'
import type { Todo } from '../types/todo'

const emit = defineEmits<{
  seeAll: []
  log: [prefill: { type?: TransactionType; amount?: number; label?: string; walletId?: string }]
}>()
const { todos, setDone } = useTodos()
const { format } = useSettings()

const pending = computed(() =>
  todos.value
    .filter((t) => !t.done)
    .sort((a, b) => ((a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1))
    .slice(0, 5),
)

const error = ref('')
const busyId = ref<string | null>(null)

async function toggle(todo: Todo) {
  error.value = ''
  busyId.value = todo.id
  try {
    await setDone(todo.id, true)
    if (todo.amount != null) {
      emit('log', {
        type: todo.type ?? undefined,
        amount: todo.amount,
        label: todo.title,
        walletId: todo.walletId ?? undefined,
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not update this to-do.'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="px-5 pt-6 pb-2">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Money to-dos</h3>
      <button class="text-xs" style="color: var(--accent)" @click="emit('seeAll')">See all ›</button>
    </div>
    <p v-if="error" class="text-xs mb-2" style="color: var(--money-out)">{{ error }}</p>

    <p v-if="!pending.length" class="text-xs py-1" style="color: var(--paper-dim)">Nothing on your list yet.</p>

    <div
      v-for="t in pending"
      :key="t.id"
      class="flex items-center justify-between py-2.5 border-b border-dashed"
      style="border-color: var(--ink-line)"
    >
      <label class="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          :disabled="busyId === t.id"
          class="accent-[color:var(--accent)] shrink-0"
          @change="toggle(t)"
        />
        <span class="min-w-0">
          <p class="text-sm truncate">{{ t.title }}</p>
          <p class="text-xs" style="color: var(--paper-dim)">
            <template v-if="t.amount != null">{{ format(t.amount) }}</template>
            <template v-if="t.dueDate"> · Due {{ t.dueDate }}</template>
          </p>
        </span>
      </label>
    </div>
  </div>
</template>
