<script setup lang="ts">
const emit = defineEmits<{ back: [] }>()

const perks: { title: string; sub: string }[] = [
  { title: 'Safe to spend', sub: 'One daily number after bills and savings' },
  { title: 'Recurring entries', sub: 'Rent, salary and subscriptions log themselves' },
  { title: 'Unlimited wallets', sub: 'Free plan keeps 2' },
  { title: 'Shared wallets', sub: 'Track money with a partner or team' },
  { title: 'Paste a MoMo SMS', sub: 'Turn a confirmation text into an entry' },
]
</script>

<template>
  <div
    class="min-h-screen pb-7 px-5 pt-[18px] flex flex-col gap-[22px]"
    style="background: var(--bg); color: var(--text)"
  >
    <div class="flex items-center justify-between">
      <button
        type="button"
        aria-label="Close"
        class="rounded-full border flex items-center justify-center"
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
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <button
        type="button"
        disabled
        class="text-[13px] font-semibold opacity-40"
        style="color: var(--text-dim); min-height: 44px"
      >
        Restore purchase
      </button>
    </div>

    <div class="flex flex-col gap-2.5">
      <span
        class="self-start rounded-full px-2.5 flex items-center text-xs font-extrabold"
        style="height: 26px; background: var(--accent-surface); color: var(--accent-text); letter-spacing: 0.4px"
      >
        RECKON PRO
      </span>
      <h1 class="text-[32px] font-extrabold tracking-tight leading-tight">Know exactly what you can spend today.</h1>
      <p class="text-[15px] leading-relaxed" style="color: var(--text-dim)">
        Everything in Free, plus the tools that keep money from quietly disappearing.
      </p>
    </div>

    <div class="flex flex-col gap-3.5">
      <div v-for="p in perks" :key="p.title" class="flex gap-3 items-start">
        <span
          class="rounded-full flex items-center justify-center shrink-0"
          style="width: 26px; height: 26px; background: var(--accent-surface); color: var(--money-in)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
        <div class="flex flex-col gap-0.5">
          <p class="text-sm font-bold">{{ p.title }}</p>
          <p class="text-[13px]" style="color: var(--text-dim)">{{ p.sub }}</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2.5 mt-auto">
      <button
        type="button"
        disabled
        class="flex justify-between items-center px-4 rounded-2xl text-left opacity-50"
        style="min-height: 64px; background: var(--accent-surface); border: 2px solid var(--accent); color: var(--text)"
      >
        <span class="flex flex-col gap-0.5">
          <span class="text-sm font-extrabold">Yearly</span>
          <span class="text-xs font-bold" style="color: var(--accent-text)">2 months free</span>
        </span>
        <span class="text-base font-extrabold">Coming soon</span>
      </button>
      <button
        type="button"
        disabled
        class="flex justify-between items-center px-4 rounded-2xl text-left border opacity-50"
        style="min-height: 64px; background: var(--surface); border-color: var(--line); color: var(--text)"
      >
        <span class="text-sm font-bold">Monthly</span>
        <span class="text-base font-bold">Coming soon</span>
      </button>
      <button
        type="button"
        disabled
        class="rounded-2xl text-base font-extrabold mt-1.5 opacity-50"
        style="height: 54px; background: var(--accent); color: var(--on-accent)"
      >
        Start 7-day free trial
      </button>
      <p class="text-center text-xs" style="color: var(--text-dim)">
        Pay with MTN MoMo or Orange Money · cancel anytime
      </p>
    </div>
  </div>
</template>
