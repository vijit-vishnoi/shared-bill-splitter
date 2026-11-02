import { Hono } from 'hono'
import type { BalanceItem, BillRow, HomeRow, MemberRow, ShareRow } from './types'
import { splitCentsEqually } from './utils/splitter'

const app = new Hono<{ Bindings: Env }>()

// Global error handler guaranteeing JSON error format
app.onError((err, c) => {
  return c.json({ error: err.message || 'Internal Server Error' }, 500)
})

app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Part 1: Homes & Members
app.post('/api/homes', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof body.name !== 'string' ||
    body.name.trim() === ''
  ) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  await c.env.DB.prepare('INSERT INTO homes (id, name) VALUES (?, ?)').bind(id, name).run()

  return c.json({ id, name }, 201)
})

app.get('/api/homes', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT id, name, created_at FROM homes ORDER BY created_at DESC',
  ).all<HomeRow>()

  return c.json({ homes: result.results }, 200)
})

app.get('/api/homes/:homeId', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id, name, created_at FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRow>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const members = await c.env.DB.prepare(
    'SELECT id, home_id AS homeId, name, created_at FROM members WHERE home_id = ? ORDER BY created_at ASC',
  )
    .bind(homeId)
    .all<MemberRow>()

  return c.json(
    {
      id: home.id,
      name: home.name,
      createdAt: home.created_at,
      members: members.results,
    },
    200,
  )
})

app.post('/api/homes/:homeId/members', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRow>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof body.name !== 'string' ||
    body.name.trim() === ''
  ) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const id = crypto.randomUUID()
  const name = body.name.trim()

  await c.env.DB.prepare('INSERT INTO members (id, home_id, name) VALUES (?, ?, ?)')
    .bind(id, homeId, name)
    .run()

  return c.json({ id, homeId, name }, 201)
})

// Part 2: Bills and Splitting
app.post('/api/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRow>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Invalid body' }, 400)
  }

  const title = 'title' in body && typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return c.json({ error: 'Title is required' }, 400)
  }

  const totalCents = 'totalCents' in body ? body.totalCents : undefined
  if (typeof totalCents !== 'number' || !Number.isInteger(totalCents) || totalCents <= 0) {
    return c.json({ error: 'totalCents must be a positive integer' }, 422)
  }

  const membersResult = await c.env.DB.prepare(
    'SELECT id, name, created_at FROM members WHERE home_id = ? ORDER BY created_at ASC',
  )
    .bind(homeId)
    .all<MemberRow>()

  const members = membersResult.results
  if (members.length === 0) {
    return c.json({ error: 'Home has no members' }, 422)
  }

  const memberIds = members.map((m) => m.id)
  const splits = splitCentsEqually(totalCents, memberIds)

  const billId = crypto.randomUUID()
  const shareRecords = splits.map((s) => ({
    id: crypto.randomUUID(),
    memberId: s.memberId,
    amountCents: s.amountCents,
    paidAt: null as string | null,
  }))

  const statements = [
    c.env.DB.prepare(
      'INSERT INTO bills (id, home_id, title, total_cents) VALUES (?, ?, ?, ?)',
    ).bind(billId, homeId, title, totalCents),
    ...shareRecords.map((s) =>
      c.env.DB.prepare(
        'INSERT INTO shares (id, bill_id, member_id, amount_cents) VALUES (?, ?, ?, ?)',
      ).bind(s.id, billId, s.memberId, s.amountCents),
    ),
  ]

  await c.env.DB.batch(statements)

  return c.json(
    {
      id: billId,
      homeId,
      title,
      totalCents,
      shares: shareRecords,
    },
    201,
  )
})

app.get('/api/homes/:homeId/bills', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRow>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const billsResult = await c.env.DB.prepare(
    'SELECT id, home_id AS homeId, title, total_cents AS totalCents, created_at FROM bills WHERE home_id = ? ORDER BY created_at DESC',
  )
    .bind(homeId)
    .all<{ id: string; homeId: string; title: string; totalCents: number; created_at: string }>()

  const sharesResult = await c.env.DB.prepare(
    `SELECT s.id, s.bill_id, s.member_id AS memberId, m.name AS memberName, s.amount_cents AS amountCents, s.paid_at AS paidAt
     FROM shares s
     JOIN members m ON m.id = s.member_id
     JOIN bills b ON b.id = s.bill_id
     WHERE b.home_id = ?
     ORDER BY m.created_at ASC`,
  )
    .bind(homeId)
    .all<{
      id: string
      bill_id: string
      memberId: string
      memberName: string
      amountCents: number
      paidAt: string | null
    }>()

  const sharesByBill = new Map<
    string,
    Array<{
      id: string
      memberId: string
      memberName: string
      amountCents: number
      paidAt: string | null
    }>
  >()
  for (const share of sharesResult.results) {
    const list = sharesByBill.get(share.bill_id) ?? []
    list.push({
      id: share.id,
      memberId: share.memberId,
      memberName: share.memberName,
      amountCents: share.amountCents,
      paidAt: share.paidAt,
    })
    sharesByBill.set(share.bill_id, list)
  }

  const bills = billsResult.results.map((b) => ({
    id: b.id,
    homeId: b.homeId,
    title: b.title,
    totalCents: b.totalCents,
    createdAt: b.created_at,
    shares: sharesByBill.get(b.id) ?? [],
  }))

  return c.json({ bills }, 200)
})

// Part 3: Concurrency and Idempotency
app.post('/api/bills/:billId/shares/:shareId/pay', async (c) => {
  const billId = c.req.param('billId')
  const shareId = c.req.param('shareId')

  const idempotencyKey = c.req.header('Idempotency-Key')
  if (!idempotencyKey || idempotencyKey.trim() === '') {
    return c.json({ error: 'Idempotency-Key header is required' }, 400)
  }

  const trimmedKey = idempotencyKey.trim()

  const bill = await c.env.DB.prepare('SELECT id FROM bills WHERE id = ?')
    .bind(billId)
    .first<BillRow>()

  if (!bill) {
    return c.json({ error: 'Bill not found' }, 404)
  }

  const share = await c.env.DB.prepare(
    'SELECT id, bill_id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ? AND bill_id = ?',
  )
    .bind(shareId, billId)
    .first<ShareRow>()

  if (!share) {
    return c.json({ error: 'Share not found' }, 404)
  }

  if (share.paid_at !== null) {
    if (share.idempotency_key === trimmedKey) {
      return c.json(
        {
          id: share.id,
          memberId: share.member_id,
          amountCents: share.amount_cents,
          paidAt: share.paid_at,
        },
        200,
      )
    }
    return c.json({ error: 'Share already paid with a different idempotency key' }, 409)
  }

  const updated = await c.env.DB.prepare(
    'UPDATE shares SET paid_at = CURRENT_TIMESTAMP, idempotency_key = ? WHERE id = ? AND paid_at IS NULL RETURNING id, member_id, amount_cents, paid_at, idempotency_key',
  )
    .bind(trimmedKey, shareId)
    .first<ShareRow>()

  if (updated) {
    return c.json(
      {
        id: updated.id,
        memberId: updated.member_id,
        amountCents: updated.amount_cents,
        paidAt: updated.paid_at,
      },
      200,
    )
  }

  const refetched = await c.env.DB.prepare(
    'SELECT id, member_id, amount_cents, paid_at, idempotency_key FROM shares WHERE id = ?',
  )
    .bind(shareId)
    .first<ShareRow>()

  if (refetched && refetched.idempotency_key === trimmedKey) {
    return c.json(
      {
        id: refetched.id,
        memberId: refetched.member_id,
        amountCents: refetched.amount_cents,
        paidAt: refetched.paid_at,
      },
      200,
    )
  }

  return c.json({ error: 'Share already paid' }, 409)
})

// Part 4: Balances
app.get('/api/homes/:homeId/balances', async (c) => {
  const homeId = c.req.param('homeId')

  const home = await c.env.DB.prepare('SELECT id FROM homes WHERE id = ?')
    .bind(homeId)
    .first<HomeRow>()

  if (!home) {
    return c.json({ error: 'Home not found' }, 404)
  }

  const result = await c.env.DB.prepare(
    `SELECT 
       m.id AS memberId,
       m.name AS name,
       COALESCE(
         (SELECT SUM(s.amount_cents) 
          FROM shares s 
          JOIN bills b ON b.id = s.bill_id 
          WHERE s.member_id = m.id 
            AND b.home_id = m.home_id 
            AND s.paid_at IS NULL), 
         0
       ) AS outstandingCents
     FROM members m
     WHERE m.home_id = ?
     ORDER BY m.created_at ASC`,
  )
    .bind(homeId)
    .all<BalanceItem>()

  return c.json({ balances: result.results }, 200)
})

export default app
