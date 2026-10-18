<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useTodos } from '../composables/useTodos'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'
import { TYPE_META } from '../types/transaction'
import type { TransactionType } from '../types/transaction'
import type { Todo } from '../types/todo'

const emit = defineEmits<{
  back: []
  log: [prefill: { type?: TransactionType; amount?: number; label?: string; walletId?: string }]
}>()
const { todos, addTodo, setDone, removeTodo } = useTodos()
const { format } = useSettings()
const { wallets } = useWallets()

const pending = computed(() =>
  todos.value.filter((t) => !t.done).sort((a, b) => ((a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1)),
)
const completed = computed(() => todos.value.filter((t) => t.done))

const types: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Received' },
  { value: 'lend', label: 'Lent out' },
  { value: 'repay', label: 'Paid back' },
  { value: 'save', label: 'Saved' },
  { value: 'withdraw', label: 'From savings' },
  { value: 'borrow', label: 'Borrowed' },
  { value: 'payback', label: 'Repaid' },
]

const showAdd = ref(false)
const form = reactive({
  title: '',
  amount: '',
  type: '' as TransactionType | '',
  dueDate: '',
  walletId: '',
})
const addError = ref('')
const adding = ref(false)

function openAdd() {
  form.title = ''
  form.amount = ''
  form.type = ''
  form.dueDate = ''
  form.walletId = ''
  addError.value = ''
  showAdd.value = true
}

async function confirmAdd() {
  addError.value = ''
  adding.value = true
  try {
    await addTodo({
      title: form.title,
      amount: form.amount ? parseFloat(form.amount) : null,
      type: form.type || null,
      dueDate: form.dueDate || null,
      walletId: form.walletId || null,
    })
    showAdd.value = false
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    adding.value = false
  }
}

const toggleError = ref('')
const busyId = ref<string | null>(null)

async function toggle(todo: Todo) {
  toggleError.value = ''
  busyId.value = todo.id
  const newDone = !todo.done
  try {
    await setDone(todo.id, newDone)
    if (newDone && todo.amount != null) {
      emit('log', {
        type: todo.type ?? undefined,
        amount: todo.amount,
        label: todo.title,
        walletId: todo.walletId ?? undefined,
      })
    }
  } catch (e) {
    toggleError.value = e instanceof Error ? e.message : 'Could not update this to-do.'
  } finally {
    busyId.value = null
  }
}

const pendingDelete = ref<Todo | null>(null)
const deleteError = ref('')

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleteError.value = ''
  try {
    await removeTodo(pendingDelete.value.id)
    pendingDelete.value = null
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Could not delete this to-do.'
  }
}

function walletName(id: string | null) {
  if (!id) return ''
  return wallets.value.find((w) => w.id === id)?.name ?? ''
}
</script>

<template>
  <div class="min-h-screen pb-28" style="background: var(--bg); color: var(--text)">
    <header class="flex items-center gap-3 px-5 pt-5 pb-2">
      <button aria-label="Back" class="text-lg leading-none" style="color: var(--text-dim)" @click="emit('back')">
        ‹
      </button>
      <h1 class="text-sm font-semibold">Money to-do list</h1>
    </header>

    <div class="px-5 pt-2">
      <p v-if="toggleError" class="text-xs mb-2" style="color: var(--warn-text)">{{ toggleError }}</p>

      <p v-if="!pending.length && !completed.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
        Nothing on your list yet.
      </p>

      <div
        v-for="t in pending"
        :key="t.id"
        class="flex items-center justify-between py-2.5 border-b"
        style="border-color: var(--line)"
      >
        <label class="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            :checked="t.done"
            :disabled="busyId === t.id"
            class="accent-[color:var(--accent)] shrink-0"
            @change="toggle(t)"
          />
          <span class="min-w-0">
            <p class="text-sm truncate">{{ t.title }}</p>
            <p class="text-xs" style="color: var(--text-dim)">
              <template v-if="t.amount != null"
                >{{ format(t.amount) }}<template v-if="t.type"> · {{ TYPE_META[t.type].verb }}</template></template
              >
              <template v-if="t.dueDate"> · Due {{ t.dueDate }}</template>
              <template v-if="t.walletId"> · {{ walletName(t.walletId) }}</template>
            </p>
          </span>
        </label>
        <button class="text-xs shrink-0 pl-3" style="color: var(--text-dim)" @click="pendingDelete = t">✕</button>
      </div>

      <template v-if="completed.length">
        <h3 class="text-xs uppercase tracking-wide mt-5 mb-1" style="color: var(--text-dim)">Done</h3>
        <div
          v-for="t in completed"
          :key="t.id"
          class="flex items-center justify-between py-2.5 border-b"
          style="border-color: var(--line)"
        >
          <label class="flex items-center gap-3 min-w-0">
            <input
              type="checkbox"
              :checked="t.done"
              :disabled="busyId === t.id"
              class="accent-[color:var(--accent)] shrink-0"
              @change="toggle(t)"
            />
            <span class="text-sm truncate line-through" style="color: var(--text-dim)">{{ t.title }}</span>
          </label>
          <button class="text-xs shrink-0 pl-3" style="color: var(--text-dim)" @click="pendingDelete = t">✕</button>
        </div>
      </template>
    </div>

    <button
      class="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full font-medium text-sm shadow-lg"
      style="background: var(--accent); color: var(--on-accent)"
      @click="openAdd"
    >
      + Add to-do
    </button>

    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div class="absolute inset-0 bg-black/60" @click="showAdd = false" />
      <form
        class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto"
        style="background: var(--surface)"
        @submit.prevent="confirmAdd"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">New to-do</h2>
          <button type="button" class="text-sm" style="color: var(--text-dim)" @click="showAdd = false">Cancel</button>
        </div>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Title</span>
          <input
            v-model="form.title"
            type="text"
            required
            autofocus
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          />
        </label>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Amount (optional)</span>
          <input
            v-model="form.amount"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            placeholder="0"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          />
        </label>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Type (optional)</span>
          <select
            v-model="form.type"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          >
            <option value="">None</option>
            <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </label>

        <label v-if="wallets.length > 1" class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Wallet (optional)</span>
          <select
            v-model="form.walletId"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          >
            <option value="">None</option>
            <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </label>

        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Due date (optional)</span>
          <input
            v-model="form.dueDate"
            type="date"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          />
        </label>

        <p v-if="addError" class="text-xs mb-3" style="color: var(--warn-text)">{{ addError }}</p>

        <button
          type="submit"
          :disabled="adding"
          class="w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          style="background: var(--accent); color: var(--on-accent)"
        >
          {{ adding ? 'Saving…' : 'Add to-do' }}
        </button>
      </form>
    </div>

    <div v-if="pendingDelete" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="pendingDelete = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-1">Delete "{{ pendingDelete.title }}"?</h2>
        <p class="text-sm mb-4" style="color: var(--text-dim)">This can't be undone.</p>
        <p v-if="deleteError" class="text-xs mb-3" style="color: var(--warn-text)">{{ deleteError }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="pendingDelete = null"
          >
            Cancel
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style="background: var(--money-out); color: var(--bg)"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
