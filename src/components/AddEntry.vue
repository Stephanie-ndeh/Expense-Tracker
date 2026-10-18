<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Transaction, TransactionType } from '../types/transaction'
import { TYPE_META } from '../types/transaction'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'
import { useCategories } from '../composables/useCategories'
import { usePeople } from '../composables/usePeople'

type UiType = TransactionType | 'transfer'

const props = defineProps<{
  editing?: Transaction | null
  prefill?: { type?: TransactionType; amount?: number; label?: string; walletId?: string } | null
}>()
const emit = defineEmits<{ close: [] }>()
const {
  addTransaction,
  updateTransaction,
  addTransfer,
  updateTransfer,
  transferSibling,
  suggestedCategories,
  suggestedPeople,
  personSummaries,
} = useLedger()
const { format } = useSettings()
const { wallets, activeWalletId } = useWallets()
const { findOrCreateCategory } = useCategories()
const { findOrCreatePerson } = usePeople()

const today = new Date().toISOString().slice(0, 10)

const isEditingTransfer = props.editing?.type === 'transfer_out' || props.editing?.type === 'transfer_in'
const editingSibling = props.editing && isEditingTransfer ? transferSibling(props.editing) : null
const editingOutLeg = isEditingTransfer
  ? props.editing?.type === 'transfer_out'
    ? props.editing
    : editingSibling
  : null
const editingInLeg = isEditingTransfer ? (props.editing?.type === 'transfer_in' ? props.editing : editingSibling) : null
const editingTransferId = isEditingTransfer ? (props.editing?.transferId ?? null) : null

const defaultWalletId = activeWalletId.value !== 'all' ? activeWalletId.value : (wallets.value[0]?.id ?? '')
const defaultToWalletId = wallets.value.find((w) => w.id !== defaultWalletId)?.id ?? ''

const form = reactive({
  type: (isEditingTransfer ? 'transfer' : (props.editing?.type ?? props.prefill?.type ?? 'expense')) as UiType,
  amount: props.editing
    ? String(props.editing.amount)
    : props.prefill?.amount != null
      ? String(props.prefill.amount)
      : '',
  label: props.editing?.label ?? props.prefill?.label ?? '',
  note: props.editing?.note ?? '',
  date: props.editing?.date ?? today,
  planned: props.editing?.planned ?? false,
  walletId: props.editing?.walletId ?? props.prefill?.walletId ?? defaultWalletId,
  fromWalletId: editingOutLeg?.walletId ?? defaultWalletId,
  toWalletId: editingInLeg?.walletId ?? defaultToWalletId,
})

const mainTypes: { value: UiType; label: string }[] = [
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Received' },
  { value: 'transfer', label: 'Transfer' },
]

const moreTypes: { value: UiType; label: string }[] = [
  { value: 'lend', label: 'Lent' },
  { value: 'borrow', label: 'Borrowed' },
  { value: 'repay', label: 'Got paid back' },
  { value: 'payback', label: 'I paid back' },
  { value: 'save', label: 'To savings' },
  { value: 'withdraw', label: 'From savings' },
]

function canSelectType(value: UiType) {
  if (value === 'transfer' && wallets.value.length < 2) return false
  if (!props.editing) return true
  if (isEditingTransfer) return value === 'transfer'
  return value !== 'transfer'
}

const categorySuggestions = computed(() =>
  form.type === 'expense' || form.type === 'income' ? suggestedCategories(form.type) : [],
)
const isPersonType = (t: UiType) => t === 'lend' || t === 'repay' || t === 'borrow' || t === 'payback'
const peopleSuggestions = computed(() => (isPersonType(form.type) ? suggestedPeople() : []))
const labelSuggestions = computed(() =>
  form.type === 'expense' || form.type === 'income' ? categorySuggestions.value : peopleSuggestions.value,
)

// Default to the chip picker; drop into free-text mode only if the starting label (edit/prefill) isn't one of the suggestions.
const newLabelMode = ref(
  Boolean(form.label) && !labelSuggestions.value.some((s) => s.name.toLowerCase() === form.label.toLowerCase()),
)
function selectLabelChip(name: string) {
  form.label = name
  newLabelMode.value = false
}
function openNewLabel() {
  form.label = ''
  newLabelMode.value = true
}

const walletExpanded = ref(false)
const dateExpanded = ref(false)
const moreExpanded = ref(false)

const activeWalletName = computed(() => wallets.value.find((w) => w.id === form.walletId)?.name ?? '')
const dateDisplay = computed(() => (form.date === today ? 'Today' : form.date))

// Repay/payback: show the running balance with the typed person, if there's any history.
const debtHint = computed(() => {
  if ((form.type !== 'repay' && form.type !== 'payback') || !form.label.trim()) return null
  const match = personSummaries.value.find((p) => p.name.toLowerCase() === form.label.trim().toLowerCase())
  if (!match) return null
  return form.type === 'repay' ? { text: 'Owed', amount: match.netOwed } : { text: 'You owe', amount: match.netOwe }
})

// A stale label from one type shouldn't leak into the next.
watch(
  () => form.type,
  () => {
    form.label = ''
    newLabelMode.value = false
  },
)

const submitting = ref(false)
const submitError = ref('')

async function submit() {
  const amount = parseFloat(form.amount)
  if (!amount || amount <= 0) return

  if (form.type === 'transfer' && !props.editing && form.fromWalletId === form.toWalletId) {
    submitError.value = 'Pick two different wallets.'
    return
  }

  const typed = form.label.trim()
  if (
    form.type === 'expense' ||
    form.type === 'income' ||
    form.type === 'repay' ||
    form.type === 'borrow' ||
    form.type === 'payback'
  ) {
    if (!typed) return
  }

  submitError.value = ''
  submitting.value = true
  try {
    if (form.type === 'transfer') {
      if (props.editing) {
        await updateTransfer(editingTransferId as string, {
          amount,
          date: form.date,
          note: form.note.trim(),
          planned: form.planned || form.date > today,
        })
      } else {
        await addTransfer({
          fromWalletId: form.fromWalletId,
          toWalletId: form.toWalletId,
          amount,
          date: form.date,
          note: form.note.trim(),
          planned: form.planned || form.date > today,
        })
      }
    } else {
      let label = typed
      let categoryId: string | null = null
      let personId: string | null = null

      if (form.type === 'expense' || form.type === 'income') {
        const category = await findOrCreateCategory(typed, form.type)
        label = category.name
        categoryId = category.id
      } else if (isPersonType(form.type)) {
        if (typed) {
          const person = await findOrCreatePerson(typed)
          label = person.name
          personId = person.id
        } else {
          label = TYPE_META[form.type].labelHint
        }
      } else {
        label = typed || TYPE_META[form.type].labelHint
      }

      const payload = {
        type: form.type,
        amount,
        label,
        note: form.note.trim(),
        categoryId,
        personId,
        date: form.date,
        planned: form.planned || form.date > today,
        walletId: form.walletId,
      }

      if (props.editing) {
        await updateTransaction(props.editing.id, payload)
      } else {
        await addTransaction(payload)
      }
    }
    emit('close')
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not save this entry.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col justify-end">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
    <p class="relative px-5 pt-5 text-sm font-semibold" style="color: var(--text-dim)">{{ activeWalletName }}</p>
    <form
      class="relative rounded-t-[26px] border-t p-5 pb-7 flex flex-col gap-[18px] max-h-[85vh] overflow-y-auto"
      style="background: var(--surface); border-color: var(--line)"
      @submit.prevent="submit"
    >
      <div class="self-center rounded-full" style="width: 40px; height: 5px; background: var(--line)" />

      <div class="flex items-center justify-between">
        <h2 class="text-xl font-extrabold">{{ editing ? 'Edit entry' : 'New entry' }}</h2>
        <button type="button" class="text-sm font-semibold" style="color: var(--text-dim)" @click="emit('close')">
          Cancel
        </button>
      </div>

      <div class="grid grid-cols-3 p-1 rounded-2xl" style="background: var(--bg)">
        <button
          v-for="t in mainTypes"
          :key="t.value"
          type="button"
          :disabled="!canSelectType(t.value)"
          class="text-sm py-2.5 rounded-xl disabled:opacity-40"
          :style="
            form.type === t.value
              ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 800 }
              : { color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="form.type = t.value"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button
          v-for="t in moreTypes"
          :key="t.value"
          type="button"
          :disabled="!canSelectType(t.value)"
          class="text-xs py-2 px-3 rounded-full border disabled:opacity-40"
          :style="
            form.type === t.value
              ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)', fontWeight: 700 }
              : { borderColor: 'var(--line)', color: 'var(--text-dim)', fontWeight: 600 }
          "
          @click="form.type = t.value"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="flex flex-col items-center gap-1 py-1.5">
        <span class="text-xs font-semibold" style="color: var(--text-dim)">Amount</span>
        <input
          v-model="form.amount"
          type="number"
          inputmode="decimal"
          min="0"
          step="any"
          required
          autofocus
          placeholder="0"
          class="w-full bg-transparent text-center font-extrabold outline-none tabular-nums"
          style="color: var(--text); font-size: 44px; letter-spacing: -1px"
        />
      </div>

      <div v-if="form.type === 'save' || form.type === 'withdraw'" class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--text-dim)">{{ TYPE_META[form.type].labelHint }}</span>
        <input
          v-model="form.label"
          type="text"
          class="w-full rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--bg); border-color: var(--line); color: var(--text)"
        />
      </div>

      <div v-else-if="form.type !== 'transfer'" class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--text-dim)">{{ TYPE_META[form.type].labelHint }}</span>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="s in labelSuggestions"
            :key="s.id"
            type="button"
            class="text-[13px] py-2 px-3.5 rounded-full"
            :style="
              !newLabelMode && form.label.toLowerCase() === s.name.toLowerCase()
                ? { background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 800 }
                : { background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }
            "
            @click="selectLabelChip(s.name)"
          >
            {{ s.name }}
          </button>
          <button
            type="button"
            class="text-[13px] py-2 px-3.5 rounded-full border border-dashed"
            style="border-color: var(--line); color: var(--text-dim); font-weight: 600"
            @click="openNewLabel"
          >
            + New
          </button>
        </div>
        <input
          v-if="newLabelMode"
          v-model="form.label"
          type="text"
          autofocus
          :required="form.type !== 'lend'"
          :placeholder="isPersonType(form.type) ? 'Type a name' : 'Type a category'"
          class="w-full rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--bg); border-color: var(--line); color: var(--text)"
        />
        <p v-if="debtHint" class="text-xs" style="color: var(--text-dim)">
          {{ debtHint.text }} {{ format(debtHint.amount) }}
        </p>
      </div>

      <template v-if="form.type === 'transfer'">
        <div v-if="editing" class="text-sm flex flex-col gap-2">
          <p>
            <span class="text-xs font-semibold block" style="color: var(--text-dim)">From</span>
            {{ wallets.find((w) => w.id === form.fromWalletId)?.name ?? '—' }}
          </p>
          <p>
            <span class="text-xs font-semibold block" style="color: var(--text-dim)">To</span>
            {{ wallets.find((w) => w.id === form.toWalletId)?.name ?? '—' }}
          </p>
        </div>
        <template v-else>
          <label class="flex flex-col gap-2">
            <span class="text-xs font-semibold" style="color: var(--text-dim)">From wallet</span>
            <select
              v-model="form.fromWalletId"
              class="w-full rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--bg); border-color: var(--line); color: var(--text)"
            >
              <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-xs font-semibold" style="color: var(--text-dim)">To wallet</span>
            <select
              v-model="form.toWalletId"
              class="w-full rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--bg); border-color: var(--line); color: var(--text)"
            >
              <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </label>
        </template>
      </template>

      <div class="rounded-2xl" style="background: var(--bg)">
        <template v-if="wallets.length > 1 && form.type !== 'transfer'">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3.5 text-left border-b"
            style="min-height: 50px; border-color: var(--line)"
            @click="walletExpanded = !walletExpanded"
          >
            <span class="flex-1 text-sm font-semibold" style="color: var(--text-dim)">Wallet</span>
            <span class="text-sm font-bold">{{ activeWalletName }}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-dim)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          <div v-if="walletExpanded" class="px-3.5 py-3 border-b" style="border-color: var(--line)">
            <select
              v-model="form.walletId"
              class="w-full rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--surface); border-color: var(--line); color: var(--text)"
            >
              <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>
        </template>

        <button
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left border-b"
          style="min-height: 50px; border-color: var(--line)"
          @click="dateExpanded = !dateExpanded"
        >
          <span class="flex-1 text-sm font-semibold" style="color: var(--text-dim)">Date</span>
          <span class="text-sm font-bold">{{ dateDisplay }}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <div v-if="dateExpanded" class="px-3.5 py-3 border-b" style="border-color: var(--line)">
          <input
            v-model="form.date"
            type="date"
            autofocus
            class="w-full rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--surface); border-color: var(--line); color: var(--text)"
          />
        </div>

        <button
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          style="min-height: 50px"
          @click="moreExpanded = !moreExpanded"
        >
          <span class="flex-1 text-sm font-semibold" style="color: var(--text-dim)">Note, planned</span>
          <span class="text-sm font-bold">{{ moreExpanded ? 'Hide' : 'Add' }}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <div v-if="moreExpanded" class="px-3.5 pb-3.5 flex flex-col gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold" style="color: var(--text-dim)">Note (optional)</span>
            <input
              v-model="form.note"
              type="text"
              class="w-full rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--surface); border-color: var(--line); color: var(--text)"
            />
          </label>
          <label class="flex items-center gap-2 text-sm select-none" style="color: var(--text-dim)">
            <input v-model="form.planned" type="checkbox" class="accent-[color:var(--accent)]" />
            Just planned
          </label>
        </div>
      </div>

      <p v-if="submitError" class="text-xs" style="color: var(--warn-text)">{{ submitError }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="py-3.5 rounded-2xl font-extrabold text-base disabled:opacity-50 mt-1"
        style="background: var(--accent); color: var(--on-accent)"
      >
        {{ submitting ? 'Saving…' : editing ? 'Save changes' : `Save · ${format(parseFloat(form.amount) || 0)}` }}
      </button>
    </form>
  </div>
</template>
