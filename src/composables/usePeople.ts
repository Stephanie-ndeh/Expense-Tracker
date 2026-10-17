import { computed, reactive } from 'vue'
import type { Person } from '../types/person'
import { supabase } from '../lib/supabaseClient'

export type PersonRow = {
  id: string
  name: string
  phone: string | null
}

export function rowToPerson(r: PersonRow): Person {
  return { id: r.id, name: r.name, phone: r.phone }
}

const state = reactive({
  people: [] as Person[],
})

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function usePeople() {
  const people = computed(() => state.people)

  function findPerson(name: string): Person | undefined {
    const trimmed = name.trim().toLowerCase()
    return state.people.find((p) => p.name.toLowerCase() === trimmed)
  }

  /** Looks up an existing person case-insensitively first (no network call); only inserts if nothing matches. */
  async function findOrCreatePerson(name: string): Promise<Person> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name is required.')

    const existing = findPerson(trimmed)
    if (existing) return existing

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error("You're offline — only existing people can be used until you're back online.")
    }

    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const person: Person = { id: crypto.randomUUID(), name: trimmed, phone: null }
    const { error } = await supabase.from('people').insert({
      id: person.id,
      user_id: userId,
      name: person.name,
    })
    if (error) {
      if (error.code === '23505') {
        const { data } = await supabase.from('people').select('*').ilike('name', trimmed).maybeSingle()
        if (data) {
          const found = rowToPerson(data)
          state.people.push(found)
          return found
        }
      }
      throw error
    }
    state.people.push(person)
    return person
  }

  /** Authoritative overwrite from Supabase — the server is the only source of truth, so no merge. */
  function replacePeople(items: Person[]) {
    state.people = items
  }

  function clearPeople() {
    state.people = []
  }

  return {
    people,
    findOrCreatePerson,
    replacePeople,
    clearPeople,
  }
}
