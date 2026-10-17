import type { TransactionType } from './transaction'

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule {
  id: string
  walletId: string
  type: TransactionType
  amount: number
  note: string
  label: string
  categoryId: string | null
  personId: string | null
  frequency: RecurringFrequency
  startDate: string
  endDate: string | null
  lastGeneratedDate: string | null
  paused: boolean
  createdAt: number
}
