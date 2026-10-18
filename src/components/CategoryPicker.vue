<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useCategories } from '../composables/useCategories'
import type { CategoryKind } from '../types/category'

const props = defineProps<{ kind: CategoryKind }>()
const emit = defineEmits<{ select: [name: string]; back: [] }>()

const { categoryUsageCounts } = useLedger()
const { categories } = useCategories()

const title = props.kind === 'expense' ? 'Spent on what?' : 'Received from where?'

const query = ref('')

const counts = computed(() => categoryUsageCounts(props.kind))
const ofKind = computed(() => categories.value.filter((c) => c.kind === props.kind))

function countLabel(id: string) {
  const n = counts.value.get(id) ?? 0
  return `${n} ${n === 1 ? 'entry' : 'entries'}`
}

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return ofKind.value
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => (counts.value.get(b.id) ?? 0) - (counts.value.get(a.id) ?? 0))
})

const hasExactMatch = computed(() => {
  const q = query.value.trim().toLowerCase()
  return !q || ofKind.value.some((c) => c.name.toLowerCase() === q)
})

const allSorted = computed(() => ofKind.value.slice().sort((a, b) => a.name.localeCompare(b.name)))

function pick(name: string) {
  emit('select', name)
}
</script>

<template>
  <div class="fixed inset-0 z-[60] flex flex-col justify-end">
    <div class="absolute inset-0 bg-black/60" @click="emit('back')" />
    <div
      class="relative rounded-t-[26px] border-t p-5 pb-6 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
      style="background: var(--surface); border-color: var(--line)"
    >
      <div class="self-center rounded-full" style="width: 40px; height: 5px; background: var(--line)" />

      <div class="flex items-center justify-between">
        <h2 class="text-xl font-extrabold">{{ title }}</h2>
        <button type="button" class="text-sm font-semibold" style="color: var(--text-dim)" @click="emit('back')">
          Back
        </button>
      </div>

      <label
        class="flex items-center gap-2.5 rounded-2xl px-3.5 border"
        style="height: 48px; background: var(--bg); border-color: var(--accent); color: var(--text-dim)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          v-model="query"
          type="text"
          autofocus
          placeholder="Search or create a category"
          class="flex-1 min-w-0 bg-transparent outline-none text-sm"
          style="color: var(--text)"
        />
      </label>

      <div v-if="query.trim()" class="rounded-2xl overflow-hidden" style="background: var(--bg)">
        <button
          v-for="c in matches"
          :key="c.id"
          type="button"
          class="w-full flex items-center gap-3 px-3.5 border-b text-left"
          style="min-height: 54px; border-color: var(--line)"
          @click="pick(c.name)"
        >
          <span
            class="rounded-xl flex items-center justify-center shrink-0 font-extrabold"
            style="width: 32px; height: 32px; background: var(--surface); color: var(--accent-text); font-size: 13px"
          >
            {{ c.name.charAt(0).toUpperCase() }}
          </span>
          <span class="flex-1 text-sm font-semibold">{{ c.name }}</span>
          <span class="text-xs" style="color: var(--text-dim)">{{ countLabel(c.id) }}</span>
        </button>
        <button
          v-if="!hasExactMatch"
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          style="min-height: 54px; color: var(--accent-text)"
          @click="pick(query.trim())"
        >
          <span
            class="rounded-xl flex items-center justify-center shrink-0 border border-dashed"
            style="width: 32px; height: 32px; border-color: var(--accent)"
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
          </span>
          <span class="flex-1 text-sm font-bold">Create "{{ query.trim() }}"</span>
        </button>
      </div>

      <p class="text-xs font-bold" style="color: var(--text-dim); letter-spacing: 0.3px">
        All {{ kind === 'expense' ? 'spending' : 'income' }} categories
      </p>
      <div class="rounded-2xl overflow-hidden" style="background: var(--bg)">
        <button
          v-for="(c, i) in allSorted"
          :key="c.id"
          type="button"
          class="w-full flex items-center gap-3 px-3.5 text-left"
          :style="{ minHeight: '50px', borderBottom: i < allSorted.length - 1 ? '1px solid var(--line)' : 'none' }"
          @click="pick(c.name)"
        >
          <span
            class="rounded-xl flex items-center justify-center shrink-0 font-extrabold"
            style="width: 32px; height: 32px; background: var(--surface); color: var(--accent-text); font-size: 13px"
          >
            {{ c.name.charAt(0).toUpperCase() }}
          </span>
          <span class="flex-1 text-sm font-semibold">{{ c.name }}</span>
          <span class="text-xs" style="color: var(--text-dim)">{{ countLabel(c.id) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
