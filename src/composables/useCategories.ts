import { computed, reactive } from 'vue'
import type { Category, CategoryKind } from '../types/category'
import { supabase } from '../lib/supabaseClient'

export type CategoryRow = {
  id: string
  name: string
  kind: CategoryKind
}

export function rowToCategory(r: CategoryRow): Category {
  return { id: r.id, name: r.name, kind: r.kind }
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

    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const category: Category = { id: crypto.randomUUID(), name: trimmed, kind }
    const { error } = await supabase.from('categories').insert({
      id: category.id,
      user_id: userId,
      name: category.name,
      kind: category.kind,
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
    replaceCategories,
    clearCategories,
  }
}
