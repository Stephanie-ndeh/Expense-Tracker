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

const types: { value: UiType; short: string }[] = [
  { value: 'expense', short: 'Spent' },
  { value: 'income', short: 'Received' },
  { value: 'lend', short: 'Lent out' },
  { value: 'repay', short: 'Paid back' },
  { value: 'save', short: 'Saved' },
  { value: 'withdraw', short: 'From savings' },
  { value: 'transfer', short: 'Transfer' },
  { value: 'borrow', short: 'Borrowed' },
  { value: 'payback', short: 'Repaid' },
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
  <div class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
    <form
      class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto"
      style="background: var(--ink-raised)"
      @submit.prevent="submit"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">{{ editing ? 'Edit entry' : 'Add entry' }}</h2>
        <button type="button" class="text-sm" style="color: var(--paper-dim)" @click="emit('close')">Cancel</button>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-5">
        <button
          v-for="t in types"
          :key="t.value"
          type="button"
          :disabled="!canSelectType(t.value)"
          class="text-xs py-2 rounded-lg border transition-colors disabled:opacity-40"
          :style="
            form.type === t.value
              ? { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }
              : { borderColor: 'var(--ink-line)', color: 'var(--paper-dim)' }
          "
          @click="form.type = t.value"
        >
          {{ t.short }}
        </button>
      </div>

      <label v-if="wallets.length > 1 && form.type !== 'transfer'" class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Wallet</span>
        <select
          v-model="form.walletId"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        >
          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </label>

      <label class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Amount</span>
        <input
          v-model="form.amount"
          type="number"
          inputmode="decimal"
          min="0"
          step="any"
          required
          autofocus
          placeholder="0"
          class="w-full mt-1 bg-transparent font-mono text-3xl font-semibold outline-none tabular-nums"
          style="color: var(--paper)"
        />
      </label>

      <label v-if="form.type === 'expense' || form.type === 'income'" class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">{{
          TYPE_META[form.type].labelHint
        }}</span>
        <input
          v-model="form.label"
          type="text"
          list="category-suggestions"
          required
          placeholder="Type or pick a category"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
        <datalist id="category-suggestions">
          <option v-for="c in categorySuggestions" :key="c.id" :value="c.name" />
        </datalist>
      </label>

      <label
        v-if="form.type === 'lend' || form.type === 'repay' || form.type === 'borrow' || form.type === 'payback'"
        class="block mb-4"
      >
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">{{
          TYPE_META[form.type].labelHint
        }}</span>
        <input
          v-model="form.label"
          type="text"
          list="person-suggestions"
          :required="form.type !== 'lend'"
          placeholder="Type or pick a name"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
        <datalist id="person-suggestions">
          <option v-for="p in peopleSuggestions" :key="p.id" :value="p.name" />
        </datalist>
        <p v-if="debtHint" class="text-xs mt-1" style="color: var(--paper-dim)">
          {{ debtHint.text }} {{ format(debtHint.amount) }}
        </p>
      </label>

      <label v-if="form.type === 'save' || form.type === 'withdraw'" class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">{{
          TYPE_META[form.type].labelHint
        }}</span>
        <input
          v-model="form.label"
          type="text"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </label>

      <template v-if="form.type === 'transfer'">
        <div v-if="editing" class="mb-4 text-sm space-y-2">
          <p>
            <span class="text-xs uppercase tracking-wide block" style="color: var(--paper-dim)">From</span>
            {{ wallets.find((w) => w.id === form.fromWalletId)?.name ?? '—' }}
          </p>
          <p>
            <span class="text-xs uppercase tracking-wide block" style="color: var(--paper-dim)">To</span>
            {{ wallets.find((w) => w.id === form.toWalletId)?.name ?? '—' }}
          </p>
        </div>
        <template v-else>
          <label class="block mb-4">
            <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">From wallet</span>
            <select
              v-model="form.fromWalletId"
              class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
            >
              <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </label>
          <label class="block mb-4">
            <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">To wallet</span>
            <select
              v-model="form.toWalletId"
              class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
              style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
            >
              <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </label>
        </template>
      </template>

      <label class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Note (optional)</span>
        <input
          v-model="form.note"
          type="text"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </label>

      <div class="flex items-center gap-3 mb-6">
        <label class="flex-1">
          <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Date</span>
          <input
            v-model="form.date"
            type="date"
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
          />
        </label>
        <label class="flex items-center gap-2 pt-5 text-sm select-none" style="color: var(--paper-dim)">
          <input v-model="form.planned" type="checkbox" class="accent-[color:var(--accent)]" />
          Just planned
        </label>
      </div>

      <p v-if="submitError" class="text-xs mb-3" style="color: var(--money-out)">{{ submitError }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50"
        style="background: var(--accent); color: var(--ink)"
      >
        {{ submitting ? 'Saving…' : editing ? 'Save changes' : 'Save entry' }}
      </button>
    </form>
  </div>
</template>
