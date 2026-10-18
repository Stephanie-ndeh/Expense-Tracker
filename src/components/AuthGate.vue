<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { mapAuthError } from '../lib/authErrors'
import { GOOGLE_SIGN_IN_ENABLED, TERMS_URL, PRIVACY_URL } from '../config'
import ForgotPasswordView from './ForgotPasswordView.vue'

const { signIn, signUp } = useAuth()

const screen = ref<'auth' | 'forgot'>('auth')
const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')
const notice = ref('')

function setMode(next: 'signin' | 'signup') {
  mode.value = next
  error.value = ''
  notice.value = ''
}

async function submit() {
  error.value = ''
  notice.value = ''
  submitting.value = true
  try {
    if (mode.value === 'signin') {
      await signIn(email.value, password.value)
    } else {
      await signUp(email.value, password.value)
      notice.value = 'Check your email to confirm your account, then sign in.'
      mode.value = 'signin'
    }
  } catch (e) {
    error.value = mapAuthError(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <ForgotPasswordView v-if="screen === 'forgot'" @back="screen = 'auth'" />

  <div
    v-else
    class="min-h-screen flex flex-col gap-[22px] px-6 pt-12 pb-7"
    style="background: var(--bg); color: var(--text)"
  >
    <div class="flex flex-col gap-3.5">
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
      <h1 class="text-[30px] font-extrabold tracking-tight leading-tight">Know where every franc goes.</h1>
      <p class="text-[15px] leading-relaxed" style="color: var(--text-dim)">
        Spending, money you're owed and what's coming up, synced on every device.
      </p>
    </div>

    <div class="grid grid-cols-2 p-1 rounded-2xl border" style="background: var(--surface); border-color: var(--line)">
      <button
        type="button"
        class="py-2.5 rounded-xl text-sm"
        :style="
          mode === 'signin'
            ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 800 }
            : { color: 'var(--text-dim)', fontWeight: 600 }
        "
        @click="setMode('signin')"
      >
        Sign in
      </button>
      <button
        type="button"
        class="py-2.5 rounded-xl text-sm"
        :style="
          mode === 'signup'
            ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 800 }
            : { color: 'var(--text-dim)', fontWeight: 600 }
        "
        @click="setMode('signup')"
      >
        Create account
      </button>
    </div>

    <template v-if="GOOGLE_SIGN_IN_ENABLED">
      <button
        type="button"
        class="flex items-center justify-center gap-2.5 rounded-2xl font-bold"
        style="height: 52px; background: var(--text); color: var(--bg); font-size: 15px"
      >
        <span
          class="rounded-full border-[1.5px] border-dashed"
          style="width: 22px; height: 22px; border-color: var(--text-dim)"
          aria-hidden="true"
        />
        Continue with Google
      </button>
      <div class="flex items-center gap-3 text-xs font-semibold" style="color: var(--text-dim)">
        <span class="flex-1" style="height: 1px; background: var(--line)" />
        or with email
        <span class="flex-1" style="height: 1px; background: var(--line)" />
      </div>
    </template>

    <form class="flex flex-col gap-3.5" @submit.prevent="submit">
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

      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between">
          <label for="pw" class="text-[13px] font-semibold" style="color: var(--text-dim)">Password</label>
          <button
            v-if="mode === 'signin'"
            type="button"
            class="text-[13px] font-bold"
            style="color: var(--accent-text)"
            @click="screen = 'forgot'"
          >
            Forgot password?
          </button>
        </div>
        <div
          class="flex items-center rounded-2xl border"
          :style="{
            height: '50px',
            padding: '0 4px 0 14px',
            background: 'var(--surface)',
            borderColor: error ? 'var(--money-out)' : 'var(--line)',
          }"
        >
          <input
            id="pw"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            required
            minlength="6"
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
      </div>

      <p v-if="error" role="alert" class="text-[13px] font-semibold" style="color: var(--warn-text)">{{ error }}</p>
      <p v-if="notice" class="text-[13px] font-semibold" style="color: var(--accent-text)">{{ notice }}</p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-2xl font-extrabold disabled:opacity-50 mt-1"
        style="height: 54px; background: var(--accent); color: var(--on-accent); font-size: 16px"
      >
        {{ submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
      </button>
    </form>

    <p class="mt-auto text-xs text-center leading-relaxed" style="color: var(--text-dim)">
      By continuing you agree to the
      <a :href="TERMS_URL" target="_blank" rel="noopener" class="font-bold" style="color: var(--accent-text)">Terms</a>
      and
      <a :href="PRIVACY_URL" target="_blank" rel="noopener" class="font-bold" style="color: var(--accent-text)"
        >Privacy Policy</a
      >.
    </p>
  </div>
</template>
