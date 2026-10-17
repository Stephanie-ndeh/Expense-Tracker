export type TransactionType =
  'expense' | 'income' | 'lend' | 'repay' | 'save' | 'withdraw' | 'transfer_out' | 'transfer_in' | 'borrow' | 'payback'

export interface Transaction {
  id: string
  walletId: string
  type: TransactionType
  amount: number
  date: string // ISO date, yyyy-mm-dd
  note: string
  /** category for expense/income, person's name for lend/repay, counterpart wallet's name for transfer_out/transfer_in */
  label: string
  /** links to categories/people tables for expense/income/lend/repay — resolved via findOrCreate, not user-set directly */
  categoryId: string | null
  personId: string | null
  /** shared by exactly one transfer_out row and one transfer_in row that make up a single transfer */
  transferId: string | null
  /** true = hasn't happened yet, excluded from balance, shown in "coming up" */
  planned: boolean
  createdAt: number
  /** client-only — true while this row (or an edit/delete of it) is still queued offline, never sent to or read from Supabase */
  pendingSync?: boolean
}

export const TYPE_META: Record<
  TransactionType,
  { verb: string; sign: 1 | -1; labelHint: string; group: 'cash' | 'lending' | 'savings' | 'transfer' | 'debt' }
> = {
  income: { verb: 'Received', sign: 1, labelHint: 'From / source', group: 'cash' },
  expense: { verb: 'Spent', sign: -1, labelHint: 'On what', group: 'cash' },
  lend: { verb: 'Lent out', sign: -1, labelHint: "Who's it for", group: 'lending' },
  repay: { verb: 'Paid back', sign: 1, labelHint: 'By whom', group: 'lending' },
  save: { verb: 'Moved to savings', sign: -1, labelHint: 'Savings goal (optional)', group: 'savings' },
  withdraw: { verb: 'Took from savings', sign: 1, labelHint: 'Reason (optional)', group: 'savings' },
  transfer_out: { verb: 'Transferred out', sign: -1, labelHint: 'To which wallet', group: 'transfer' },
  transfer_in: { verb: 'Transferred in', sign: 1, labelHint: 'From which wallet', group: 'transfer' },
  borrow: { verb: 'Borrowed', sign: 1, labelHint: 'From whom', group: 'debt' },
  payback: { verb: 'Repaid', sign: -1, labelHint: 'To whom', group: 'debt' },
}
