<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useTodos } from '../composables/useTodos'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'
import { useLedger } from '../composables/useLedger'
import type { TransactionType } from '../types/transaction'
import type { Todo } from '../types/todo'

const emit = defineEmits<{
  log: [prefill: { type?: TransactionType; amount?: number; label?: string; walletId?: string }]
}>()
const { todos, addTodo, setDone, removeTodo } = useTodos()
const { format } = useSettings()
const { wallets } = useWallets()
const { balance } = useLedger()

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function weekEndStr() {
  const d = new Date()
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

const pendingTodos = computed(() => todos.value.filter((t) => !t.done))
const completed = computed(() => todos.value.filter((t) => t.done))

const overdue = computed(() =>
  pendingTodos.value
    .filter((t) => t.dueDate && t.dueDate < todayStr())
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)),
)
const thisWeek = computed(() =>
  pendingTodos.value
    .filter((t) => t.dueDate && t.dueDate >= todayStr() && t.dueDate <= weekEndStr())
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)),
)
const later = computed(() =>
  pendingTodos.value
    .filter((t) => !t.dueDate || t.dueDate > weekEndStr())
    .sort((a, b) => ((a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1)),
)

const dueThisWeekAmount = computed(() => [...overdue.value, ...thisWeek.value].reduce((s, t) => s + (t.amount ?? 0), 0))
const balanceAfter = computed(() => balance.value - dueThisWeekAmount.value)

const filter = ref<'all' | 'money' | 'done'>('all')
const allCount = computed(() => pendingTodos.value.length)
const moneyCount = computed(() => pendingTodos.value.filter((t) => t.amount != null).length)

function applyMoneyFilter(list: Todo[]) {
  return filter.value === 'money' ? list.filter((t) => t.amount != null) : list
}
const overdueShown = computed(() => applyMoneyFilter(overdue.value))
const thisWeekShown = computed(() => applyMoneyFilter(thisWeek.value))
const laterShown = computed(() => applyMoneyFilter(later.value))

function walletName(id: string | null) {
  if (!id) return ''
  return wallets.value.find((w) => w.id === id)?.name ?? ''
}

function formatRelative(date: string) {
  const d = new Date(date + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.round((d.getTime() - new Date(now.toDateString()).getTime()) / 86400000)
  if (Math.abs(diffDays) <= 6) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function subtitle(t: Todo, overdueItem: boolean) {
  const parts: string[] = []
  if (t.dueDate) parts.push(overdueItem ? `Was due ${formatRelative(t.dueDate)}` : formatRelative(t.dueDate))
  if (t.amount != null) parts.push(format(t.amount))
  if (t.walletId) parts.push(walletName(t.walletId))
  return parts.join(' · ')
}

function laterSubtitle(t: Todo) {
  const parts: string[] = []
  if (t.dueDate) {
    const d = new Date(t.dueDate + 'T00:00:00')
    parts.push(`Due ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`)
  }
  if (t.amount != null) parts.push(format(t.amount))
  if (t.walletId) parts.push(walletName(t.walletId))
  return parts.join(' · ')
}

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
</script>

<template>
  <div class="pb-10 px-5">
    <header class="flex items-center justify-between pt-5 pb-3" style="min-height: 44px">
      <h1 class="text-[26px] font-extrabold tracking-tight">To-dos</h1>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-full px-3.5 text-sm font-bold"
        style="height: 40px; background: var(--text); color: var(--bg)"
        @click="openAdd"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
    </header>

    <p v-if="toggleError" class="text-xs mb-2" style="color: var(--warn-text)">{{ toggleError }}</p>

    <p v-if="!todos.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
      Nothing on your list yet.
    </p>

    <template v-else>
      <div
        class="rounded-2xl border p-3.5 flex items-center justify-between"
        style="background: var(--surface); border-color: var(--line)"
      >
        <div class="flex flex-col gap-1">
          <p class="text-xs font-semibold" style="color: var(--text-dim)">Money due this week</p>
          <p class="text-[22px] font-extrabold tracking-tight">{{ format(dueThisWeekAmount) }}</p>
        </div>
        <div class="text-right text-xs leading-relaxed" style="color: var(--text-dim)">
          After that you'd have<br />
          <span class="text-sm font-bold" :style="{ color: balanceAfter < 0 ? 'var(--money-out)' : 'var(--text)' }">
            {{ format(balanceAfter) }}
          </span>
        </div>
      </div>

      <div class="flex gap-2 pt-4">
        <button
          type="button"
          class="rounded-full px-3.5 text-[13px]"
          style="height: 34px"
          :style="
            filter === 'all'
              ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 700 }
              : { border: '1px solid var(--line)', color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="filter = 'all'"
        >
          All · {{ allCount }}
        </button>
        <button
          type="button"
          class="rounded-full px-3.5 text-[13px]"
          style="height: 34px"
          :style="
            filter === 'money'
              ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 700 }
              : { border: '1px solid var(--line)', color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="filter = 'money'"
        >
          With money · {{ moneyCount }}
        </button>
        <button
          type="button"
          class="rounded-full px-3.5 text-[13px]"
          style="height: 34px"
          :style="
            filter === 'done'
              ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 700 }
              : { border: '1px solid var(--line)', color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="filter = 'done'"
        >
          Done
        </button>
      </div>

      <template v-if="filter !== 'done'">
        <template v-if="overdueShown.length">
          <p class="text-xs font-bold py-1" style="color: var(--warn-text); letter-spacing: 0.3px">Overdue</p>
          <div
            v-for="t in overdueShown"
            :key="t.id"
            class="flex items-center gap-3 border-t"
            style="min-height: 64px; border-color: var(--line)"
          >
            <button
              type="button"
              aria-label="Mark done"
              :disabled="busyId === t.id"
              class="rounded-lg border-[1.5px] shrink-0 disabled:opacity-50"
              style="width: 26px; height: 26px; border-color: var(--money-out)"
              @click="toggle(t)"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ t.title }}</p>
              <p class="text-xs" style="color: var(--warn-text)">{{ subtitle(t, true) }}</p>
            </div>
            <button
              v-if="t.amount != null"
              type="button"
              class="rounded-full px-3 text-xs font-bold shrink-0"
              style="
                height: 32px;
                background: var(--accent-surface);
                border: 1px solid var(--accent-surface-line);
                color: var(--accent-text);
              "
              @click="toggle(t)"
            >
              Log it
            </button>
            <button class="text-xs shrink-0" style="color: var(--text-dim)" @click="pendingDelete = t">✕</button>
          </div>
        </template>

        <template v-if="thisWeekShown.length">
          <p class="text-xs font-bold pt-3 py-1" style="color: var(--text-dim); letter-spacing: 0.3px">This week</p>
          <div
            v-for="t in thisWeekShown"
            :key="t.id"
            class="flex items-center gap-3 border-t"
            style="min-height: 64px; border-color: var(--line)"
          >
            <button
              type="button"
              aria-label="Mark done"
              :disabled="busyId === t.id"
              class="rounded-lg border-[1.5px] shrink-0 disabled:opacity-50"
              style="width: 26px; height: 26px; border-color: var(--text-dim)"
              @click="toggle(t)"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ t.title }}</p>
              <p class="text-xs" style="color: var(--text-dim)">{{ subtitle(t, false) }}</p>
            </div>
            <button
              v-if="t.amount != null"
              type="button"
              class="rounded-full px-3 text-xs font-bold shrink-0"
              style="
                height: 32px;
                background: var(--accent-surface);
                border: 1px solid var(--accent-surface-line);
                color: var(--accent-text);
              "
              @click="toggle(t)"
            >
              Log it
            </button>
            <button class="text-xs shrink-0" style="color: var(--text-dim)" @click="pendingDelete = t">✕</button>
          </div>
        </template>

        <template v-if="laterShown.length">
          <p class="text-xs font-bold pt-3 py-1" style="color: var(--text-dim); letter-spacing: 0.3px">Later</p>
          <div
            v-for="t in laterShown"
            :key="t.id"
            class="flex items-center gap-3 border-t"
            style="min-height: 64px; border-color: var(--line)"
          >
            <button
              type="button"
              aria-label="Mark done"
              :disabled="busyId === t.id"
              class="rounded-lg border-[1.5px] shrink-0 disabled:opacity-50"
              style="width: 26px; height: 26px; border-color: var(--text-dim)"
              @click="toggle(t)"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ t.title }}</p>
              <p class="text-xs" style="color: var(--text-dim)">{{ laterSubtitle(t) }}</p>
            </div>
            <button
              v-if="t.amount != null"
              type="button"
              class="rounded-full px-3 text-xs font-bold shrink-0"
              style="
                height: 32px;
                background: var(--accent-surface);
                border: 1px solid var(--accent-surface-line);
                color: var(--accent-text);
              "
              @click="toggle(t)"
            >
              Log it
            </button>
            <button class="text-xs shrink-0" style="color: var(--text-dim)" @click="pendingDelete = t">✕</button>
          </div>
        </template>

        <p
          v-if="!overdueShown.length && !thisWeekShown.length && !laterShown.length"
          class="text-sm py-6 text-center"
          style="color: var(--text-dim)"
        >
          Nothing here.
        </p>
      </template>

      <template v-else>
        <p v-if="!completed.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
          Nothing done yet.
        </p>
        <div
          v-for="t in completed"
          :key="t.id"
          class="flex items-center gap-3 border-t"
          style="min-height: 64px; border-color: var(--line)"
        >
          <button
            type="button"
            aria-label="Mark not done"
            :disabled="busyId === t.id"
            class="rounded-lg shrink-0 flex items-center justify-center disabled:opacity-50"
            style="width: 26px; height: 26px; background: var(--accent); color: var(--on-accent)"
            @click="toggle(t)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <p class="flex-1 text-sm truncate line-through" style="color: var(--text-dim)">{{ t.title }}</p>
          <button class="text-xs shrink-0" style="color: var(--text-dim)" @click="pendingDelete = t">✕</button>
        </div>
      </template>
    </template>

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
