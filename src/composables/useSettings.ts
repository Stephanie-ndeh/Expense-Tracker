import { reactive, watch } from 'vue'

const KEY = 'ledger.settings.v1'

interface Settings {
  currency: string
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { currency: 'FCFA' }
}

const settings = reactive(load())

watch(settings, (val) => localStorage.setItem(KEY, JSON.stringify(val)), { deep: true })

export function useSettings() {
  function format(amount: number) {
    const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))
    return `${n} ${settings.currency}`
  }
  return { settings, format }
}
