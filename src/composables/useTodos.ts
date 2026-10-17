import { computed, reactive } from 'vue'
import type { Todo } from '../types/todo'
import type { TransactionType } from '../types/transaction'
import { supabase } from '../lib/supabaseClient'

function uid() {
  return crypto.randomUUID()
}

export type TodoRow = {
  id: string
  title: string
  amount: number | string | null
  type: string | null
  due_date: string | null
  wallet_id: string | null
  done: boolean
  created_at: string
}

export function rowToTodo(r: TodoRow): Todo {
  return {
    id: r.id,
    title: r.title,
    amount: r.amount == null ? null : Number(r.amount),
    type: r.type as TransactionType | null,
    dueDate: r.due_date,
    walletId: r.wallet_id,
    done: r.done,
    createdAt: new Date(r.created_at).getTime(),
  }
}

function todoToRow(t: Todo, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    amount: t.amount,
    type: t.type,
    due_date: t.dueDate,
    wallet_id: t.walletId,
    done: t.done,
    created_at: new Date(t.createdAt).toISOString(),
  }
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

const state = reactive({
  todos: [] as Todo[],
})

export function useTodos() {
  const todos = computed(() => state.todos)

  async function addTodo(input: {
    title: string
    amount: number | null
    type: TransactionType | null
    dueDate: string | null
    walletId: string | null
  }) {
    const title = input.title.trim()
    if (!title) throw new Error('A title is required.')
    if (!supabase) throw new Error('Supabase is not configured')
    const userId = await getUserId()
    if (!userId) throw new Error('Not signed in')

    const todo: Todo = { id: uid(), ...input, title, done: false, createdAt: Date.now() }
    const { error } = await supabase.from('todos').insert(todoToRow(todo, userId))
    if (error) throw error
    state.todos.push(todo)
  }

  async function setDone(id: string, done: boolean) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.from('todos').update({ done }).eq('id', id)
    if (error) throw error
    const todo = state.todos.find((t) => t.id === id)
    if (todo) todo.done = done
  }

  async function removeTodo(id: string) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.from('todos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    const idx = state.todos.findIndex((t) => t.id === id)
    if (idx !== -1) state.todos.splice(idx, 1)
  }

  /** Authoritative overwrite from Supabase — the server is the only source of truth, so no merge. */
  function replaceTodos(items: Todo[]) {
    state.todos = items
  }

  function clearTodos() {
    state.todos = []
  }

  return {
    todos,
    addTodo,
    setDone,
    removeTodo,
    replaceTodos,
    clearTodos,
  }
}
