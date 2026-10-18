<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTodos } from '../composables/useTodos'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { TYPE_META } from '../types/transaction'
import type { TransactionType } from '../types/transaction'
import type { Todo } from '../types/todo'

const emit = defineEmits<{
  seeAll: []
  log: [prefill: { type?: TransactionType; amount?: number; label?: string; walletId?: string }]
}>()

const { todos, setDone } = useTodos()
const { upcoming, markSettled } = useLedger()
const { format } = useSettings()

type Item = {
  key: string
  sortKey: string
  title: string
  sub: string
  amount: number | null
  color: string
  sign: '' | '+' | '−'
} & ({ kind: 'todo'; todo: Todo } | { kind: 'transaction'; id: string })

function formatDue(date: string) {
  return `Due ${new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

const items = computed<Item[]>(() => {
  const todoItems: Item[] = todos.value
    .filter((t) => !t.done)
    .map((t) => ({
      kind: 'todo',
      key: `todo-${t.id}`,
      sortKey: t.dueDate ?? '9999',
      title: t.title,
      sub: t.dueDate ? formatDue(t.dueDate) : 'No due date',
      amount: t.amount,
      color: 'var(--money-out)',
      sign: '',
      todo: t,
    }))
  const txItems: Item[] = upcoming.value.map((t) => ({
    kind: 'transaction',
    key: `tx-${t.id}`,
    sortKey: t.date,
    title: t.label,
    sub: `${formatDue(t.date)} · ${TYPE_META[t.type].verb}`,
    amount: t.amount,
    color: TYPE_META[t.type].sign > 0 ? 'var(--money-in)' : 'var(--money-out)',
    sign: TYPE_META[t.type].sign > 0 ? '+' : '−',
    id: t.id,
  }))
  return [...todoItems, ...txItems].sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1)).slice(0, 2)
})

const error = ref('')
const busyKey = ref<string | null>(null)

async function complete(item: Item) {
  error.value = ''
  busyKey.value = item.key
  try {
    if (item.kind === 'todo') {
      await setDone(item.todo.id, true)
      if (item.todo.amount != null) {
        emit('log', {
          type: item.todo.type ?? undefined,
          amount: item.todo.amount,
          label: item.todo.title,
          walletId: item.todo.walletId ?? undefined,
        })
      }
    } else {
      await markSettled(item.id)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not update this item.'
  } finally {
    busyKey.value = null
  }
}
</script>

<template>
  <div class="px-5 pt-6 pb-2 flex flex-col gap-1">
    <div class="flex items-baseline justify-between">
      <h3 class="text-base font-bold">Up next</h3>
      <button type="button" class="text-xs font-bold" style="color: var(--accent-text)" @click="emit('seeAll')">
        All to-dos
      </button>
    </div>
    <p v-if="error" class="text-xs" style="color: var(--warn-text)">{{ error }}</p>
    <p v-if="!items.length" class="text-xs py-1" style="color: var(--text-dim)">Nothing coming up.</p>
    <div v-for="item in items" :key="item.key" class="flex items-center gap-3" style="min-height: 52px">
      <button
        type="button"
        :disabled="busyKey === item.key"
        class="rounded-[7px] border shrink-0 disabled:opacity-50"
        style="width: 22px; height: 22px; border-width: 1.5px; border-color: var(--text-dim)"
        aria-label="Mark done"
        @click="complete(item)"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate">{{ item.title }}</p>
        <p class="text-xs" style="color: var(--text-dim)">{{ item.sub }}</p>
      </div>
      <div v-if="item.amount != null" class="text-sm font-bold shrink-0" :style="{ color: item.color }">
        {{ item.sign }}{{ format(item.amount) }}
      </div>
    </div>
  </div>
</template>
