<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { mapAuthError } from '../lib/authErrors'

const { userEmail, updatePassword } = useAuth()

const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')

const strength = computed(() => {
  const p = password.value
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[0-9]/.test(p) && /[a-zA-Z]/.test(p)) score++
  if (/[^a-zA-Z0-9]/.test(p)) score++
  return score
})
const strengthLabel = computed(() => {
  if (!password.value) return ''
  if (strength.value <= 1) return 'Weak'
  if (strength.value <= 2) return 'Fair'
  if (strength.value === 3) return 'Good'
  return 'Strong'
})

async function submit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'Choose a password with at least 6 characters.'
    return
  }
  submitting.value = true
  try {
    await updatePassword(password.value)
  } catch (e) {
    error.value = mapAuthError(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col gap-6 px-6 pt-12 pb-7" style="background: var(--bg); color: var(--text)">
    <div class="flex items-center gap-2.5">
      <span
        class="rounded-xl flex items-center justify-center"
        style="width: 40px; height: 40px; background: var(--accent); color: var(--on-accent)"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 7h14M5 12h9M5 17h5" />
          <path d="m14 17 2.5 2.5L21 15" />
        </svg>
      </span>
      <span class="text-xl font-extrabold tracking-tight">Reckon</span>
    </div>

    <div class="flex flex-col gap-2.5">
      <h1 class="text-[28px] font-extrabold tracking-tight">Set a new password</h1>
      <p class="text-[15px] leading-relaxed" style="color: var(--text-dim)">
        For <b style="color: var(--text); font-weight: 700">{{ userEmail }}</b
        >. You'll stay signed in on this device afterwards.
      </p>
    </div>

    <form class="flex flex-col gap-6" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="np" class="text-[13px] font-semibold" style="color: var(--text-dim)">New password</label>
        <div
          class="flex items-center rounded-2xl border"
          style="height: 50px; padding: 0 4px 0 14px; background: var(--surface); border-color: var(--line)"
        >
          <input
            id="np"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            class="flex-1 min-w-0 bg-transparent outline-none"
            style="color: var(--text); font-size: 15px"
          />
          <button
            type="button"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            class="flex items-center justify-center shrink-0"
            style="width: 44px; height: 44px; color: var(--text-dim)"
            @click="showPassword = !showPassword"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        <div v-if="password" class="grid grid-cols-4 gap-1.5 mt-1.5">
          <span
            v-for="i in 4"
            :key="i"
            class="rounded-sm"
            style="height: 5px"
            :style="{ background: i <= strength ? 'var(--money-in)' : 'var(--line)' }"
          />
        </div>
        <p v-if="strengthLabel" class="text-[13px] font-semibold" style="color: var(--money-in)">
          {{ strengthLabel }} — {{ password.length }} characters
        </p>
      </div>

      <p v-if="error" role="alert" class="text-[13px] font-semibold" style="color: var(--warn-text)">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-2xl font-extrabold disabled:opacity-50"
        style="height: 54px; background: var(--accent); color: var(--on-accent); font-size: 16px"
      >
        {{ submitting ? 'Saving…' : 'Save and continue' }}
      </button>
    </form>

    <p class="mt-auto text-xs text-center leading-relaxed" style="color: var(--text-dim)">
      This link expires 1 hour after it was sent.
    </p>
  </div>
</template>
