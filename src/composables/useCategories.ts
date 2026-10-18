import { computed, reactive } from 'vue'
import type { Category, CategoryKind } from '../types/category'
import { supabase } from '../lib/supabaseClient'

export type CategoryRow = {
  id: string
  name: string
  kind: CategoryKind
  hidden: boolean
}

export function rowToCategory(r: CategoryRow): Category {
  return { id: r.id, name: r.name, kind: r.kind, hidden: r.hidden }
}

/** design/DESIGN.md's named defaults, seeded once for a genuinely new account (see seedDefaultCategories). */
export const DEFAULT_CATEGORY_NAMES: Record<CategoryKind, string[]> = {
  expense: [
    'Food',
    'Transport',
    'Bills',
    'Airtime/Data',
    'Shopping',
    'Health',
    'Personal care',
    'Household',
    'Fitness',
    'Family',
    'Church/Giving',
    'Other',
  ],
  income: ['Salary', 'Business', 'Gift', 'Other'],
}

const state = reactive({
  categories: [] as Category[],
})

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function useCategories() {
  const categories = computed(() => state.categories)

  function findCategory(name: string, kind: CategoryKind): Category | undefined {
    const trimmed = name.trim().toLowerCase()
    return state.categories.find((c) => c.kind === kind && c.name.toLowerCase() === trimmed)
  }

  /** Looks up an existing category case-insensitively first (no network call); only inserts if nothing matches. */
  async function findOrCreateCategory(name: string, kind: CategoryKind): Promise<Category> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name is required.')

    const existing = findCategory(trimmed, kind)
    if (existing) return existing

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error("You're offline — only existing categories can be used until you're back online.")
    }

    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const category: Category = { id: crypto.randomUUID(), name: trimmed, kind, hidden: false }
    const { error } = await supabase.from('categories').insert({
      id: category.id,
      user_id: userId,
      name: category.name,
      kind: category.kind,
      hidden: false,
    })
    if (error) {
      if (error.code === '23505') {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('kind', kind)
          .ilike('name', trimmed)
          .maybeSingle()
        if (data) {
          const found = rowToCategory(data)
          state.categories.push(found)
          return found
        }
      }
      throw error
    }
    state.categories.push(category)
    return category
  }

  async function renameCategory(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const current = state.categories.find((c) => c.id === id)
    if (!current) return
    if (
      state.categories.some(
        (c) => c.id !== id && c.kind === current.kind && c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      throw new Error(`A category named "${trimmed}" already exists.`)
    }
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase.from('categories').update({ name: trimmed }).eq('id', id)
    if (error) {
      throw error.code === '23505' ? new Error(`A category named "${trimmed}" already exists.`) : error
    }
    current.name = trimmed
  }

  async function setCategoryHidden(id: string, hidden: boolean) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.from('categories').update({ hidden }).eq('id', id)
    if (error) throw error
    const current = state.categories.find((c) => c.id === id)
    if (current) current.hidden = hidden
  }

  /** Local-only removal — used after merge_categories() has already deleted the row server-side. */
  function removeCategoryLocal(id: string) {
    const idx = state.categories.findIndex((c) => c.id === id)
    if (idx !== -1) state.categories.splice(idx, 1)
  }

  /** Called once by useSync.ts right after a genuinely new sign-in (see useSettings.ts's loadProfile). */
  async function seedDefaultCategories() {
    if (!supabase) return
    const userId = await getUserId()
    if (!userId) return

    const rows = (['expense', 'income'] as const).flatMap((kind) =>
      DEFAULT_CATEGORY_NAMES[kind].map((name) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        kind,
        hidden: false,
      })),
    )
    const { error } = await supabase.from('categories').insert(rows)
    if (error) throw error
    state.categories.push(...rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, hidden: false })))
  }

  /** Authoritative overwrite from Supabase — the server is the only source of truth, so no merge. */
  function replaceCategories(items: Category[]) {
    state.categories = items
  }

  function clearCategories() {
    state.categories = []
  }

  return {
    categories,
    findOrCreateCategory,
    renameCategory,
    setCategoryHidden,
    removeCategoryLocal,
    seedDefaultCategories,
    replaceCategories,
    clearCategories,
  }
}
