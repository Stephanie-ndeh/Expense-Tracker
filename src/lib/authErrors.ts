/** Maps known Supabase auth error messages to clearer, user-facing copy. Unrecognized errors fall back to the raw message. */
export function mapAuthError(e: unknown): string {
  const message = e instanceof Error ? e.message : 'Something went wrong.'

  if (/invalid login credentials/i.test(message)) {
    return "That email or password isn't right. Try again or reset your password."
  }
  if (/user already registered/i.test(message)) {
    return 'An account with that email already exists — try signing in instead.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email first — check your inbox for the link we sent.'
  }
  if (/password should be at least/i.test(message)) {
    return 'Choose a password with at least 6 characters.'
  }
  if (/after \d+ seconds?/i.test(message)) {
    return "You're doing that a bit too fast — wait a moment and try again."
  }
  if (/provider is not enabled/i.test(message)) {
    return "Google sign-in isn't turned on for this app yet."
  }
  return message
}
