<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { mapAuthError } from '../lib/authErrors'
import { GOOGLE_SIGN_IN_ENABLED, TERMS_URL, PRIVACY_URL } from '../config'
import ForgotPasswordView from './ForgotPasswordView.vue'

const { signIn, signUp, signInWithGoogle } = useAuth()

const screen = ref<'auth' | 'forgot'>('auth')
const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const googleSubmitting = ref(false)
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

async function continueWithGoogle() {
  error.value = ''
  notice.value = ''
  googleSubmitting.value = true
  try {
    await signInWithGoogle()
  } catch (e) {
    error.value = mapAuthError(e)
  } finally {
    googleSubmitting.value = false
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
        :disabled="googleSubmitting"
        class="flex items-center justify-center gap-2.5 rounded-2xl font-bold disabled:opacity-50"
        style="height: 52px; background: var(--text); color: var(--bg); font-size: 15px"
        @click="continueWithGoogle"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
          />
          <path
            fill="#FF3D00"
            d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
          />
          <path
            fill="#1976D2"
            d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
          />
        </svg>
        {{ googleSubmitting ? 'Redirecting…' : 'Continue with Google' }}
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
