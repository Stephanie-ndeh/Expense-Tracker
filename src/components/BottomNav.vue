<script setup lang="ts">
type NavItem = 'home' | 'activity' | 'todos' | 'me'

defineProps<{ active: 'home' | 'activity' | 'todos' | 'me' | 'appearance' | 'pro'; overdueCount: number }>()
const emit = defineEmits<{ navigate: [view: NavItem]; add: [] }>()
</script>

<template>
  <nav
    aria-label="Main"
    class="fixed bottom-0 inset-x-0 grid grid-cols-5 items-start pt-2"
    style="height: 84px; background: var(--nav); border-top: 1px solid var(--line)"
  >
    <button
      type="button"
      class="flex flex-col items-center gap-1 text-[11px]"
      :style="{
        color: active === 'home' ? 'var(--accent-text)' : 'var(--text-dim)',
        fontWeight: active === 'home' ? 700 : 600,
      }"
      @click="emit('navigate', 'home')"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
      Home
    </button>

    <button
      type="button"
      class="flex flex-col items-center gap-1 text-[11px]"
      :style="{
        color: active === 'activity' ? 'var(--accent-text)' : 'var(--text-dim)',
        fontWeight: active === 'activity' ? 700 : 600,
      }"
      @click="emit('navigate', 'activity')"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
      Activity
    </button>

    <button
      type="button"
      aria-label="Add entry"
      class="justify-self-center -mt-[22px] flex items-center justify-center"
      style="
        width: 56px;
        height: 56px;
        border-radius: 28px;
        background: var(--accent);
        color: var(--on-accent);
        border: 4px solid var(--bg);
      "
      @click="emit('add')"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>

    <button
      type="button"
      class="relative flex flex-col items-center gap-1 text-[11px]"
      :aria-label="overdueCount ? `To-dos, ${overdueCount} overdue` : 'To-dos'"
      :style="{
        color: active === 'todos' ? 'var(--accent-text)' : 'var(--text-dim)',
        fontWeight: active === 'todos' ? 700 : 600,
      }"
      @click="emit('navigate', 'todos')"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <path d="m8 12 3 3 5-6" />
      </svg>
      To-dos
      <span
        v-if="overdueCount"
        class="absolute flex items-center justify-center font-extrabold"
        style="
          top: -4px;
          left: calc(50% + 6px);
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          box-sizing: border-box;
          border-radius: 9px;
          background: var(--money-out);
          color: var(--on-accent);
          font-size: 11px;
          border: 2px solid var(--nav);
        "
      >
        {{ overdueCount }}
      </span>
    </button>

    <button
      type="button"
      class="flex flex-col items-center gap-1 text-[11px]"
      :style="{
        color: active === 'me' ? 'var(--accent-text)' : 'var(--text-dim)',
        fontWeight: active === 'me' ? 700 : 600,
      }"
      @click="emit('navigate', 'me')"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
      Me
    </button>
  </nav>
</template>
