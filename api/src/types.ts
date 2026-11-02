export interface HomeRow {
  id: string
  name: string
  created_at: string
}

export interface MemberRow {
  id: string
  home_id: string
  name: string
  created_at: string
}

export interface BillRow {
  id: string
  home_id: string
  title: string
  total_cents: number
  created_at: string
}

export interface ShareRow {
  id: string
  bill_id: string
  member_id: string
  amount_cents: number
  paid_at: string | null
  idempotency_key: string | null
  created_at: string
}

export interface BalanceItem {
  memberId: string
  name: string
  outstandingCents: number
}

export interface SplitResult {
  memberId: string
  amountCents: number
}
