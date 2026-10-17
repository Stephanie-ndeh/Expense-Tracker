<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Transaction, TransactionType } from '../types/transaction'
import { TYPE_META } from '../types/transaction'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { useWallets } from '../composables/useWallets'

const props = defineProps<{ editing?: Transaction | null }>()
const emit = defineEmits<{ close: [] }>()
const { addTransaction, updateTransaction, personSummaries } = useLedger()
const { format } = useSettings()
const { wallets, activeWalletId } = useWallets()

const today = new Date().toISOString().slice(0, 10)

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Airtime/Data', 'Bills', 'Family/Support', 'Other']
const INCOME_CATEGORIES = ['Salary', 'Gifted', 'Side job', 'Refund', 'Borrowed', 'Other']

function initialLabelFields(t: Transaction | null | undefined) {
  if (!t) return { label: '', otherLabel: '' }
  if (t.type === 'expense' || t.type === 'income') {
    const categories = t.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    return categories.includes(t.label) ? { label: t.label, otherLabel: '' } : { label: 'Other', otherLabel: t.label }
  }
  return { label: t.label, otherLabel: '' }
}

const initialLabel = initialLabelFields(props.editing)

const form = reactive({
  type: props.editing?.type ?? ('expense' as TransactionType),
  amount: props.editing ? String(props.editing.amount) : '',
  label: initialLabel.label,
  otherLabel: initialLabel.otherLabel,
  note: props.editing?.note ?? '',
  date: props.editing?.date ?? today,
  planned: props.editing?.planned ?? false,
  walletId:
    props.editing?.walletId ?? (activeWalletId.value !== 'all' ? activeWalletId.value : (wallets.value[0]?.id ?? '')),
})

const types: { value: TransactionType; short: string }[] = [
  { value: 'expense', short: 'Spent' },
  { value: 'income', short: 'Received' },
  { value: 'lend', short: 'Lent out' },
  { value: 'repay', short: 'Paid back' },
  { value: 'save', short: 'Saved' },
  { value: 'withdraw', short: 'From savings' },
]

const categoryOptions = computed(() => (form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES))

// A stale category/person/otherLabel from one type shouldn't leak into the next.
watch(
  () => form.type,
  () => {
    form.label = ''
    form.otherLabel = ''
  },
)

const submitting = ref(false)
const submitError = ref('')

async function submit() {
  const amount = parseFloat(form.amount)
  if (!amount || amount <= 0) return
  if ((form.type === 'expense' || form.type === 'income' || form.type === 'repay') && !form.label) return

  const label =
    form.type === 'expense' || form.type === 'income'
      ? form.label === 'Other'
        ? form.otherLabel.trim() || 'Other'
        : form.label
      : form.label.trim() || TYPE_META[form.type].labelHint

  const payload = {
    type: form.type,
    amount,
    label,
    note: form.note.trim(),
    date: form.date,
    planned: form.planned || form.date > today,
    walletId: form.walletId,
  }

  submitError.value = ''
  submitting.value = true
  try {
    if (props.editing) {
      await updateTransaction(props.editing.id, payload)
    } else {
      await addTransaction(payload)
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
          class="text-xs py-2 rounded-lg border transition-colors"
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

      <label v-if="wallets.length > 1" class="block mb-4">
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
        <select
          v-model="form.label"
          required
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        >
          <option value="" disabled>Select a category</option>
          <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>

      <label v-if="(form.type === 'expense' || form.type === 'income') && form.label === 'Other'" class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">Specify (optional)</span>
        <input
          v-model="form.otherLabel"
          type="text"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        />
      </label>

      <label v-if="form.type === 'repay'" class="block mb-4">
        <span class="text-xs uppercase tracking-wide" style="color: var(--paper-dim)">{{
          TYPE_META[form.type].labelHint
        }}</span>
        <select
          v-model="form.label"
          required
          :disabled="!personSummaries.length"
          class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink); border-color: var(--ink-line); color: var(--paper)"
        >
          <option value="" disabled>
            {{
              personSummaries.length
                ? "Select who you're paying back"
                : "No one to repay yet — log a 'Lent out' entry first"
            }}
          </option>
          <option v-for="p in personSummaries" :key="p.name" :value="p.name">
            {{ p.name }} — owed {{ format(p.netOwed) }}
          </option>
        </select>
      </label>

      <label v-if="form.type === 'lend' || form.type === 'save' || form.type === 'withdraw'" class="block mb-4">
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
