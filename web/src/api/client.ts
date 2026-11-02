export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface Home {
  id: string
  name: string
  createdAt?: string
  members?: Member[]
}

export interface Member {
  id: string
  homeId: string
  name: string
  createdAt?: string
  created_at?: string
}

export interface Balance {
  memberId: string
  name: string
  outstandingCents: number
}

export interface Share {
  id: string
  memberId: string
  memberName?: string
  amountCents: number
  paidAt: string | null
}

export interface Bill {
  id: string
  homeId: string
  title: string
  totalCents: number
  createdAt?: string
  shares: Share[]
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    })
  } catch (_networkError) {
    throw new ApiError(0, 'Network error. Please check your connection and try again.')
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    try {
      const data = (await response.json()) as { error?: string }
      if (data?.error) {
        errorMessage = data.error
      }
    } catch {
      // response was not JSON
      if (response.statusText) {
        errorMessage = response.statusText
      }
    }
    throw new ApiError(response.status, errorMessage)
  }

  return (await response.json()) as T
}

export const api = {
  createHome: (name: string) =>
    request<{ id: string; name: string }>('/api/homes', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getHomes: () => request<{ homes: Home[] }>('/api/homes'),

  getHome: (homeId: string) =>
    request<{ id: string; name: string; createdAt: string; members: Member[] }>(
      `/api/homes/${homeId}`,
    ),

  addMember: (homeId: string, name: string) =>
    request<Member>(`/api/homes/${homeId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getBalances: (homeId: string) =>
    request<{ balances: Balance[] }>(`/api/homes/${homeId}/balances`),

  createBill: (homeId: string, title: string, totalCents: number) =>
    request<Bill>(`/api/homes/${homeId}/bills`, {
      method: 'POST',
      body: JSON.stringify({ title, totalCents }),
    }),

  getBills: (homeId: string) => request<{ bills: Bill[] }>(`/api/homes/${homeId}/bills`),

  payShare: (billId: string, shareId: string, idempotencyKey: string) =>
    request<Share>(`/api/bills/${billId}/shares/${shareId}/pay`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    }),
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

