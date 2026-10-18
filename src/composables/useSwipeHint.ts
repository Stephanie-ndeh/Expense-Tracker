import { computed, reactive } from 'vue'

const KEY = 'reckon.seenSwipeHint.v1'

function loadSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const state = reactive({ seen: loadSeen() })

/** Shared across every list that shows the swipe hint — whichever mounts first marks it seen for all of them. */
export function useSwipeHint() {
  function markSeen() {
    if (state.seen) return
    state.seen = true
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignore — the hint just won't persist as seen across reloads
    }
  }
  return { show: computed(() => !state.seen), markSeen }
}
