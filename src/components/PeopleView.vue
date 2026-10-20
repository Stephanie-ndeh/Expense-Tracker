<script setup lang="ts">
import { ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useSettings } from '../composables/useSettings'
import { TYPE_META } from '../types/transaction'

const emit = defineEmits<{ close: [] }>()
const { peopleOwedToYou, peopleYouOwe, settledPeople } = useLedger()
const { format } = useSettings()

const expanded = ref<string | null>(null)
function toggle(name: string) {
  expanded.value = expanded.value === name ? null : name
}

const showSettled = ref(false)

function subtitle(p: { lent: number; repaid: number; borrowed: number; paidBack: number }) {
  const parts: string[] = []
  if (p.lent || p.repaid) parts.push(`Lent ${format(p.lent)} · Paid back ${format(p.repaid)}`)
  if (p.borrowed || p.paidBack) parts.push(`Borrowed ${format(p.borrowed)} · Repaid ${format(p.paidBack)}`)
  return parts
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
    <div
      class="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto"
      style="background: var(--surface)"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">People</h2>
        <button class="text-sm" style="color: var(--text-dim)" @click="emit('close')">Close</button>
      </div>

      <p
        v-if="!peopleOwedToYou.length && !peopleYouOwe.length && !settledPeople.length"
        class="text-sm py-6 text-center"
        style="color: var(--text-dim)"
      >
        No lending or borrowing logged yet.
      </p>

      <p
        v-else-if="!peopleOwedToYou.length && !peopleYouOwe.length"
        class="text-sm py-6 text-center"
        style="color: var(--text-dim)"
      >
        All settled!
      </p>

      <section v-if="peopleOwedToYou.length" class="mb-4">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">Owed to you</h3>
          <span class="text-xs font-medium tabular-nums" style="color: var(--money-in)">
            {{ format(peopleOwedToYou.reduce((s, p) => s + p.netBalance, 0)) }}
          </span>
        </div>
        <div v-for="p in peopleOwedToYou" :key="p.name" class="border-b" style="border-color: var(--line)">
          <button class="w-full flex items-center justify-between py-3 text-left" @click="toggle(p.name)">
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ p.name }}</p>
              <p class="text-xs" style="color: var(--text-dim)">
                <template v-for="(line, i) in subtitle(p)" :key="i"> <br v-if="i > 0" />{{ line }} </template>
              </p>
            </div>
            <p class="text-sm font-medium tabular-nums shrink-0 pl-3" style="color: var(--money-in)">
              {{ format(p.netBalance) }}
            </p>
          </button>
          <div v-if="expanded === p.name" class="pb-3 pl-1">
            <div v-for="t in p.transactions" :key="t.id" class="flex items-center justify-between py-1.5 text-xs">
              <span style="color: var(--text-dim)">
                {{ t.date }} · {{ TYPE_META[t.type].verb }}<template v-if="t.planned"> (planned)</template>
              </span>
              <span
                class="tabular-nums"
                :style="{ color: TYPE_META[t.type].sign > 0 ? 'var(--money-in)' : 'var(--money-out)' }"
              >
                {{ TYPE_META[t.type].sign > 0 ? '+' : '−' }}{{ format(t.amount) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="peopleYouOwe.length" class="mb-4">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">You owe</h3>
          <span class="text-xs font-medium tabular-nums" style="color: var(--money-out)">
            {{ format(peopleYouOwe.reduce((s, p) => s - p.netBalance, 0)) }}
          </span>
        </div>
        <div v-for="p in peopleYouOwe" :key="p.name" class="border-b" style="border-color: var(--line)">
          <button class="w-full flex items-center justify-between py-3 text-left" @click="toggle(p.name)">
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ p.name }}</p>
              <p class="text-xs" style="color: var(--text-dim)">
                <template v-for="(line, i) in subtitle(p)" :key="i"> <br v-if="i > 0" />{{ line }} </template>
              </p>
            </div>
            <p class="text-sm font-medium tabular-nums shrink-0 pl-3" style="color: var(--money-out)">
              {{ format(-p.netBalance) }}
            </p>
          </button>
          <div v-if="expanded === p.name" class="pb-3 pl-1">
            <div v-for="t in p.transactions" :key="t.id" class="flex items-center justify-between py-1.5 text-xs">
              <span style="color: var(--text-dim)">
                {{ t.date }} · {{ TYPE_META[t.type].verb }}<template v-if="t.planned"> (planned)</template>
              </span>
              <span
                class="tabular-nums"
                :style="{ color: TYPE_META[t.type].sign > 0 ? 'var(--money-in)' : 'var(--money-out)' }"
              >
                {{ TYPE_META[t.type].sign > 0 ? '+' : '−' }}{{ format(t.amount) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="settledPeople.length">
        <button
          class="w-full flex items-center justify-between py-2 text-sm font-medium"
          style="color: var(--text-dim)"
          @click="showSettled = !showSettled"
        >
          Settled ({{ settledPeople.length }})
          <span>{{ showSettled ? '▲' : '▼' }}</span>
        </button>
        <div v-if="showSettled">
          <div
            v-for="p in settledPeople"
            :key="p.name"
            class="flex items-center justify-between py-2 border-b text-sm"
            style="border-color: var(--line)"
          >
            <span>{{ p.name }}</span>
            <span style="color: var(--text-dim)">Settled on {{ formatDate(p.settledDate!) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
