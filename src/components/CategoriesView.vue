<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCategories } from '../composables/useCategories'
import { useLedger } from '../composables/useLedger'
import type { Category, CategoryKind } from '../types/category'

const emit = defineEmits<{ back: [] }>()

const { categories, renameCategory, setCategoryHidden, findOrCreateCategory } = useCategories()
const { categoryUsageCounts, mergeCategories, convertCategoryEntriesToPayback } = useLedger()

const tab = ref<CategoryKind>('expense')
const counts = computed(() => categoryUsageCounts(tab.value))
function countLabel(id: string) {
  const n = counts.value.get(id) ?? 0
  return `${n} ${n === 1 ? 'entry' : 'entries'}`
}

const expenseCount = computed(() => categories.value.filter((c) => c.kind === 'expense' && !c.hidden).length)
const incomeCount = computed(() => categories.value.filter((c) => c.kind === 'income' && !c.hidden).length)

const visibleOfTab = computed(() =>
  categories.value
    .filter((c) => c.kind === tab.value && !c.hidden)
    .slice()
    .sort((a, b) => (counts.value.get(b.id) ?? 0) - (counts.value.get(a.id) ?? 0)),
)
const hiddenOfTab = computed(() => categories.value.filter((c) => c.kind === tab.value && c.hidden))
const showHidden = ref(false)

// --- Tidy-up suggestions ---
function sharedWordGroup(cats: Category[]): Category[] | null {
  const wordMap = new Map<string, Category[]>()
  for (const c of cats) {
    const words = new Set(
      c.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2),
    )
    for (const w of words) {
      const list = wordMap.get(w) ?? []
      list.push(c)
      wordMap.set(w, list)
    }
  }
  for (const group of wordMap.values()) {
    if (group.length >= 2) return group
  }
  return null
}
const mergeSuggestion = computed(() => sharedWordGroup(visibleOfTab.value))
const mergeSuggestionTarget = computed(() => {
  if (!mergeSuggestion.value) return null
  return mergeSuggestion.value.slice().sort((a, b) => (counts.value.get(b.id) ?? 0) - (counts.value.get(a.id) ?? 0))[0]
})

const debtFlagCategories = computed(() =>
  tab.value === 'expense' ? visibleOfTab.value.filter((c) => /debt|loan|repay/i.test(c.name)) : [],
)
const reviewEntryCount = computed(() => debtFlagCategories.value.reduce((s, c) => s + (counts.value.get(c.id) ?? 0), 0))

const showMergeSuggestionConfirm = ref(false)
const mergeSuggestionBusy = ref(false)
const mergeSuggestionError = ref('')
async function confirmMergeSuggestion() {
  if (!mergeSuggestion.value || !mergeSuggestionTarget.value) return
  mergeSuggestionError.value = ''
  mergeSuggestionBusy.value = true
  try {
    for (const c of mergeSuggestion.value) {
      if (c.id === mergeSuggestionTarget.value.id) continue
      await mergeCategories(c.id, mergeSuggestionTarget.value.id)
    }
    showMergeSuggestionConfirm.value = false
  } catch (e) {
    mergeSuggestionError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    mergeSuggestionBusy.value = false
  }
}

const showReviewConfirm = ref(false)
const reviewBusy = ref(false)
const reviewError = ref('')
async function confirmReview() {
  reviewError.value = ''
  reviewBusy.value = true
  try {
    await convertCategoryEntriesToPayback(debtFlagCategories.value.map((c) => c.id))
    showReviewConfirm.value = false
  } catch (e) {
    reviewError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    reviewBusy.value = false
  }
}

// --- Row menu (rename / merge / hide) ---
const expandedId = ref<string | null>(null)
function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

const pendingRename = ref<Category | null>(null)
const renameValue = ref('')
const renameError = ref('')
const renaming = ref(false)
function openRename(c: Category) {
  pendingRename.value = c
  renameValue.value = c.name
  renameError.value = ''
  expandedId.value = null
}
async function confirmRename() {
  if (!pendingRename.value) return
  renameError.value = ''
  renaming.value = true
  try {
    await renameCategory(pendingRename.value.id, renameValue.value)
    pendingRename.value = null
  } catch (e) {
    renameError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    renaming.value = false
  }
}

const mergeSource = ref<Category | null>(null)
const mergeStep = ref<'pick' | 'confirm'>('pick')
const mergeTargetId = ref('')
const mergeError = ref('')
const merging = ref(false)
function openMerge(c: Category) {
  mergeSource.value = c
  mergeStep.value = 'pick'
  mergeTargetId.value = ''
  mergeError.value = ''
  expandedId.value = null
}
const mergeTargetOptions = computed(() => visibleOfTab.value.filter((c) => c.id !== mergeSource.value?.id))
const mergeTargetCategory = computed(() => mergeTargetOptions.value.find((c) => c.id === mergeTargetId.value) ?? null)
function pickMergeTarget(id: string) {
  mergeTargetId.value = id
  mergeStep.value = 'confirm'
}
async function confirmMerge() {
  if (!mergeSource.value || !mergeTargetId.value) return
  mergeError.value = ''
  merging.value = true
  try {
    await mergeCategories(mergeSource.value.id, mergeTargetId.value)
    mergeSource.value = null
  } catch (e) {
    mergeError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    merging.value = false
  }
}

const hideError = ref('')
async function hide(c: Category) {
  hideError.value = ''
  try {
    await setCategoryHidden(c.id, true)
    expandedId.value = null
  } catch (e) {
    hideError.value = e instanceof Error ? e.message : 'Something went wrong.'
  }
}
async function unhide(c: Category) {
  hideError.value = ''
  try {
    await setCategoryHidden(c.id, false)
  } catch (e) {
    hideError.value = e instanceof Error ? e.message : 'Something went wrong.'
  }
}

// --- Add new category ---
const showAdd = ref(false)
const newCategoryName = ref('')
const addError = ref('')
const adding = ref(false)
function openAdd() {
  newCategoryName.value = ''
  addError.value = ''
  showAdd.value = true
}
async function confirmAdd() {
  const name = newCategoryName.value.trim()
  if (!name) return
  addError.value = ''
  adding.value = true
  try {
    await findOrCreateCategory(name, tab.value)
    showAdd.value = false
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div class="min-h-screen pb-10 px-5 pt-[18px] flex flex-col gap-4" style="background: var(--bg); color: var(--text)">
    <div class="flex items-center gap-2.5" style="min-height: 44px">
      <button
        aria-label="Back to Me"
        class="rounded-full border flex items-center justify-center shrink-0"
        style="width: 44px; height: 44px; border-color: var(--line); color: var(--text)"
        @click="emit('back')"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <h1 class="flex-1 text-[22px] font-extrabold">Categories</h1>
      <button
        type="button"
        class="rounded-full px-3.5 text-sm font-bold shrink-0"
        style="height: 40px; background: var(--text); color: var(--bg)"
        @click="openAdd"
      >
        + New
      </button>
    </div>

    <div class="grid grid-cols-2 p-1 rounded-2xl border" style="background: var(--surface); border-color: var(--line)">
      <button
        type="button"
        class="py-2.5 rounded-xl text-sm"
        :style="
          tab === 'expense'
            ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 800 }
            : { color: 'var(--text-dim)', fontWeight: 600 }
        "
        @click="tab = 'expense'"
      >
        Spending · {{ expenseCount }}
      </button>
      <button
        type="button"
        class="py-2.5 rounded-xl text-sm"
        :style="
          tab === 'income'
            ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 800 }
            : { color: 'var(--text-dim)', fontWeight: 600 }
        "
        @click="tab = 'income'"
      >
        Income · {{ incomeCount }}
      </button>
    </div>

    <div
      v-if="mergeSuggestion || debtFlagCategories.length"
      class="rounded-2xl border p-3.5 flex flex-col gap-2.5"
      style="background: var(--accent-surface); border-color: var(--accent-surface-line)"
    >
      <p class="text-xs font-bold" style="color: var(--accent-text)">Tidy-up suggestions</p>

      <template v-if="mergeSuggestion">
        <div class="flex items-center gap-2.5">
          <p class="flex-1 text-sm leading-snug">
            Merge <b class="font-bold">{{ mergeSuggestion.map((c) => c.name).join(', ') }}</b> into one?
          </p>
          <button
            type="button"
            class="rounded-full px-3.5 text-xs font-extrabold shrink-0"
            style="height: 36px; background: var(--accent); color: var(--on-accent)"
            @click="showMergeSuggestionConfirm = true"
          >
            Merge
          </button>
        </div>
        <div style="height: 1px; background: var(--accent-surface-line)" />
      </template>

      <div v-if="debtFlagCategories.length" class="flex items-center gap-2.5">
        <p class="flex-1 text-sm leading-snug">
          <b class="font-bold">{{ debtFlagCategories.map((c) => c.name).join(', ') }}</b> look like repayments, not
          spending.
        </p>
        <button
          type="button"
          class="rounded-full px-3.5 text-xs font-bold shrink-0 border"
          style="height: 36px; border-color: var(--accent-surface-line); color: var(--accent-text)"
          @click="showReviewConfirm = true"
        >
          Review
        </button>
      </div>
    </div>

    <p v-if="hideError" class="text-xs" style="color: var(--warn-text)">{{ hideError }}</p>

    <div class="rounded-2xl border overflow-hidden" style="background: var(--surface); border-color: var(--line)">
      <div
        v-for="(c, i) in visibleOfTab"
        :key="c.id"
        :style="{ borderBottom: i < visibleOfTab.length - 1 || expandedId === c.id ? '1px solid var(--line)' : 'none' }"
      >
        <div class="flex items-center gap-3 pl-3.5 pr-1" style="min-height: 54px">
          <span
            class="rounded-xl flex items-center justify-center shrink-0 font-extrabold"
            style="width: 32px; height: 32px; background: var(--bg); color: var(--accent-text); font-size: 13px"
          >
            {{ c.name.charAt(0).toUpperCase() }}
          </span>
          <div class="flex-1 min-w-0 flex flex-col gap-0.5">
            <p class="text-sm font-semibold truncate">{{ c.name }}</p>
            <p class="text-xs" style="color: var(--text-dim)">{{ countLabel(c.id) }}</p>
          </div>
          <button
            type="button"
            :aria-label="expandedId === c.id ? 'Close options' : 'Options'"
            class="flex items-center justify-center shrink-0"
            style="width: 44px; height: 44px; color: var(--text-dim)"
            @click="toggleExpanded(c.id)"
          >
            <svg
              v-if="expandedId !== c.id"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div v-if="expandedId === c.id" class="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          <button
            type="button"
            class="rounded-xl text-xs font-bold"
            style="height: 40px; background: var(--bg); color: var(--text)"
            @click="openRename(c)"
          >
            Rename
          </button>
          <button
            type="button"
            class="rounded-xl text-xs font-bold border"
            style="
              height: 40px;
              background: var(--accent-surface);
              border-color: var(--accent-surface-line);
              color: var(--accent-text);
            "
            @click="openMerge(c)"
          >
            Merge into…
          </button>
          <button
            type="button"
            class="rounded-xl text-xs font-bold"
            style="height: 40px; background: var(--bg); color: var(--text)"
            @click="hide(c)"
          >
            Hide
          </button>
        </div>
      </div>
      <p v-if="!visibleOfTab.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">
        No categories yet.
      </p>
    </div>

    <button
      type="button"
      class="flex items-center justify-between rounded-2xl border px-3.5"
      style="min-height: 48px; border-color: var(--line); color: var(--text-dim)"
      @click="showHidden = !showHidden"
    >
      <span class="text-sm font-semibold">Hidden categories · {{ hiddenOfTab.length }}</span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        :style="{ transform: showHidden ? 'rotate(180deg)' : 'none' }"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div
      v-if="showHidden"
      class="rounded-2xl border overflow-hidden"
      style="background: var(--surface); border-color: var(--line)"
    >
      <div
        v-for="(c, i) in hiddenOfTab"
        :key="c.id"
        class="flex items-center gap-3 pl-3.5 pr-3.5"
        :style="{ minHeight: '54px', borderBottom: i < hiddenOfTab.length - 1 ? '1px solid var(--line)' : 'none' }"
      >
        <span
          class="rounded-xl flex items-center justify-center shrink-0 font-extrabold"
          style="width: 32px; height: 32px; background: var(--bg); color: var(--text-dim); font-size: 13px"
        >
          {{ c.name.charAt(0).toUpperCase() }}
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <p class="text-sm font-semibold truncate">{{ c.name }}</p>
          <p class="text-xs" style="color: var(--text-dim)">{{ countLabel(c.id) }}</p>
        </div>
        <button
          type="button"
          class="rounded-full px-3 text-xs font-bold shrink-0"
          style="height: 32px; background: var(--bg); color: var(--accent-text)"
          @click="unhide(c)"
        >
          Unhide
        </button>
      </div>
      <p v-if="!hiddenOfTab.length" class="text-sm py-6 text-center" style="color: var(--text-dim)">Nothing hidden.</p>
    </div>

    <!-- Add new category -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="showAdd = false" />
      <form
        class="relative w-full max-w-xs rounded-2xl p-5"
        style="background: var(--surface)"
        @submit.prevent="confirmAdd"
      >
        <h2 class="text-sm font-semibold mb-3">New {{ tab === 'expense' ? 'spending' : 'income' }} category</h2>
        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Name</span>
          <input
            v-model="newCategoryName"
            type="text"
            autofocus
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
          />
        </label>
        <p v-if="addError" class="text-xs mb-3" style="color: var(--warn-text)">{{ addError }}</p>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="showAdd = false"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="adding"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--on-accent)"
          >
            {{ adding ? 'Adding…' : 'Add' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Rename -->
    <div v-if="pendingRename" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="pendingRename = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-3">Rename category</h2>
        <label class="block mb-4">
          <span class="text-xs uppercase tracking-wide" style="color: var(--text-dim)">Name</span>
          <input
            v-model="renameValue"
            type="text"
            autofocus
            class="w-full mt-1 rounded-lg px-3 py-2 text-base outline-none border"
            style="background: var(--bg); border-color: var(--line); color: var(--text)"
            @keyup.enter="confirmRename"
          />
        </label>
        <p v-if="renameError" class="text-xs mb-3" style="color: var(--warn-text)">{{ renameError }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="pendingRename = null"
          >
            Cancel
          </button>
          <button
            :disabled="renaming"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--on-accent)"
            @click="confirmRename"
          >
            {{ renaming ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Merge into… -->
    <div v-if="mergeSource" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="mergeSource = null" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <template v-if="mergeStep === 'pick'">
          <h2 class="text-sm font-semibold mb-3">Merge "{{ mergeSource.name }}" into…</h2>
          <div class="rounded-xl border overflow-hidden max-h-64 overflow-y-auto" style="border-color: var(--line)">
            <button
              v-for="(c, i) in mergeTargetOptions"
              :key="c.id"
              type="button"
              class="w-full text-left px-3.5 py-2.5 text-sm font-semibold"
              :style="{ borderBottom: i < mergeTargetOptions.length - 1 ? '1px solid var(--line)' : 'none' }"
              @click="pickMergeTarget(c.id)"
            >
              {{ c.name }}
            </button>
            <p v-if="!mergeTargetOptions.length" class="text-sm py-4 text-center" style="color: var(--text-dim)">
              No other categories to merge into.
            </p>
          </div>
          <button
            class="w-full mt-3 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="mergeSource = null"
          >
            Cancel
          </button>
        </template>
        <template v-else>
          <h2 class="text-sm font-semibold mb-1">Move entries?</h2>
          <p class="text-sm mb-4" style="color: var(--text-dim)">
            Move {{ countLabel(mergeSource.id) }} from {{ mergeSource.name }} to {{ mergeTargetCategory?.name }}? This
            can't be undone.
          </p>
          <p v-if="mergeError" class="text-xs mb-3" style="color: var(--warn-text)">{{ mergeError }}</p>
          <div class="flex gap-2">
            <button
              class="flex-1 py-2 rounded-lg text-xs font-medium border"
              style="border-color: var(--line); color: var(--text)"
              @click="mergeStep = 'pick'"
            >
              Back
            </button>
            <button
              :disabled="merging"
              class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
              style="background: var(--accent); color: var(--on-accent)"
              @click="confirmMerge"
            >
              {{ merging ? 'Merging…' : 'Merge' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Tidy-up merge confirm -->
    <div v-if="showMergeSuggestionConfirm" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="showMergeSuggestionConfirm = false" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-1">Merge into "{{ mergeSuggestionTarget?.name }}"?</h2>
        <p class="text-sm mb-4" style="color: var(--text-dim)">
          {{
            mergeSuggestion
              ?.filter((c) => c.id !== mergeSuggestionTarget?.id)
              .map((c) => c.name)
              .join(', ')
          }}
          will move into {{ mergeSuggestionTarget?.name }}. This can't be undone.
        </p>
        <p v-if="mergeSuggestionError" class="text-xs mb-3" style="color: var(--warn-text)">
          {{ mergeSuggestionError }}
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="showMergeSuggestionConfirm = false"
          >
            Cancel
          </button>
          <button
            :disabled="mergeSuggestionBusy"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--on-accent)"
            @click="confirmMergeSuggestion"
          >
            {{ mergeSuggestionBusy ? 'Merging…' : 'Merge' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Debt-flag review confirm -->
    <div v-if="showReviewConfirm" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60" @click="showReviewConfirm = false" />
      <div class="relative w-full max-w-xs rounded-2xl p-5" style="background: var(--surface)">
        <h2 class="text-sm font-semibold mb-1">Change to "I paid back"?</h2>
        <p class="text-sm mb-4" style="color: var(--text-dim)">
          {{ reviewEntryCount }} {{ reviewEntryCount === 1 ? 'entry' : 'entries' }} in
          {{ debtFlagCategories.map((c) => c.name).join(', ') }} will change from Spent to I paid back. This can't be
          undone.
        </p>
        <p v-if="reviewError" class="text-xs mb-3" style="color: var(--warn-text)">{{ reviewError }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-medium border"
            style="border-color: var(--line); color: var(--text)"
            @click="showReviewConfirm = false"
          >
            Cancel
          </button>
          <button
            :disabled="reviewBusy"
            class="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            style="background: var(--accent); color: var(--on-accent)"
            @click="confirmReview"
          >
            {{ reviewBusy ? 'Updating…' : 'Change' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
