<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { signIn, signUp } = useAuth()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')
const notice = ref('')

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
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6" style="background: var(--ink); color: var(--paper)">
    <div class="w-full max-w-xs">
      <h1 class="text-lg font-semibold mb-1">Big Steph</h1>
      <p class="text-xs mb-6" style="color: var(--paper-dim)">
        {{ mode === 'signin' ? 'Sign in to sync your ledger.' : 'Create an account to sync your ledger.' }}
      </p>

      <form @submit.prevent="submit" class="space-y-3">
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="Email"
          required
          class="w-full rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink-raised); border-color: var(--ink-line); color: var(--paper)"
        />
        <input
          v-model="password"
          type="password"
          :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
          placeholder="Password"
          required
          minlength="6"
          class="w-full rounded-lg px-3 py-2 text-base outline-none border"
          style="background: var(--ink-raised); border-color: var(--ink-line); color: var(--paper)"
        />

        <p v-if="error" class="text-xs" style="color: var(--money-out)">{{ error }}</p>
        <p v-if="notice" class="text-xs" style="color: var(--accent)">{{ notice }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          style="background: var(--accent); color: var(--ink)"
        >
          {{ submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
        </button>
      </form>

      <button
        @click="mode = mode === 'signin' ? 'signup' : 'signin'; error = ''; notice = ''"
        class="w-full text-center text-xs mt-4"
        style="color: var(--paper-dim)"
      >
        {{ mode === 'signin' ? "No account yet? Create one" : 'Already have an account? Sign in' }}
      </button>
    </div>
  </div>
</template>
