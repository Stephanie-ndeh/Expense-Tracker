<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { mapAuthError } from '../lib/authErrors'

const emit = defineEmits<{ back: [] }>()
const { resetPasswordForEmail } = useAuth()

const email = ref('')
const sent = ref(false)
const sending = ref(false)
const error = ref('')
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = 60
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function send() {
  error.value = ''
  sending.value = true
  try {
    await resetPasswordForEmail(email.value)
    sent.value = true
    startCooldown()
  } catch (e) {
    error.value = mapAuthError(e)
  } finally {
    sending.value = false
  }
}

function resend() {
  if (cooldown.value > 0) return
  void send()
}

function formatCooldown() {
  const m = Math.floor(cooldown.value / 60)
  const s = cooldown.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="min-h-screen flex flex-col gap-6 px-6 pt-5 pb-7" style="background: var(--bg); color: var(--text)">
    <button
      type="button"
      aria-label="Back to sign in"
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

    <span
      class="rounded-2xl flex items-center justify-center"
      style="width: 56px; height: 56px; background: var(--accent-surface); color: var(--accent-text)"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="10" width="16" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    </span>

    <template v-if="!sent">
      <div class="flex flex-col gap-2.5">
        <h1 class="text-[28px] font-extrabold tracking-tight">Forgot your password?</h1>
        <p class="text-[15px] leading-relaxed" style="color: var(--text-dim)">
          Enter the email you signed up with and we'll send you a link to set a new one.
        </p>
      </div>
      <form class="flex flex-col gap-6" @submit.prevent="send">
        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-semibold" style="color: var(--text-dim)">Email</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="rounded-2xl px-3.5 outline-none border"
            style="
              height: 50px;
              background: var(--surface);
              border-color: var(--line);
              color: var(--text);
              font-size: 15px;
            "
          />
        </label>
        <p v-if="error" role="alert" class="text-[13px] font-semibold" style="color: var(--warn-text)">{{ error }}</p>
        <button
          type="submit"
          :disabled="sending"
          class="rounded-2xl font-extrabold disabled:opacity-50"
          style="height: 54px; background: var(--accent); color: var(--on-accent); font-size: 16px"
        >
          {{ sending ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>
    </template>

    <template v-else>
      <div class="flex flex-col gap-2.5">
        <h1 class="text-[28px] font-extrabold tracking-tight">Check your email</h1>
        <p class="text-[15px] leading-relaxed" style="color: var(--text-dim)">
          If an account exists for <b style="color: var(--text); font-weight: 700">{{ email }}</b
          >, a reset link is on its way. It works for 1 hour.
        </p>
      </div>
      <div
        class="rounded-2xl p-4 border text-[13px] leading-relaxed"
        style="background: var(--surface); border-color: var(--line); color: var(--text-dim)"
      >
        Can't find it? Check spam or promotions, and make sure you used the same email you signed up with.
      </div>
      <button
        type="button"
        :disabled="cooldown > 0"
        class="rounded-2xl border font-bold disabled:opacity-50"
        style="height: 48px; border-color: var(--line); color: var(--text)"
        @click="resend"
      >
        {{ cooldown > 0 ? `Resend in ${formatCooldown()}` : 'Resend link' }}
      </button>
    </template>

    <button
      type="button"
      class="mt-auto text-sm font-bold"
      style="color: var(--accent-text); min-height: 44px"
      @click="emit('back')"
    >
      Back to sign in
    </button>
  </div>
</template>
