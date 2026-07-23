export type TransactionType =
  | 'expense'
  | 'income'
  | 'lend'
  | 'repay'
  | 'save'
  | 'withdraw'

export interface Transaction {
  id: string
  walletId: string
  type: TransactionType
  amount: number
  date: string // ISO date, yyyy-mm-dd
  note: string
  /** category for expense/income, person's name for lend/repay */
  label: string
  /** true = hasn't happened yet, excluded from balance, shown in "coming up" */
  planned: boolean
  createdAt: number
}

export const TYPE_META: Record<
  TransactionType,
  { verb: string; sign: 1 | -1; labelHint: string; group: 'cash' | 'lending' | 'savings' }
> = {
  income: { verb: 'Received', sign: 1, labelHint: 'From / source', group: 'cash' },
  expense: { verb: 'Spent', sign: -1, labelHint: 'On what', group: 'cash' },
  lend: { verb: 'Lent out', sign: -1, labelHint: "Who's it for", group: 'lending' },
  repay: { verb: 'Paid back', sign: 1, labelHint: 'By whom', group: 'lending' },
  save: { verb: 'Moved to savings', sign: -1, labelHint: 'Savings goal (optional)', group: 'savings' },
  withdraw: { verb: 'Took from savings', sign: 1, labelHint: 'Reason (optional)', group: 'savings' },
}
