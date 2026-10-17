import type { TransactionType } from './transaction'

export interface Todo {
  id: string
  title: string
  amount: number | null
  type: TransactionType | null
  dueDate: string | null
  walletId: string | null
  done: boolean
  createdAt: number
}
