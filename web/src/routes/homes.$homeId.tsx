import { createFileRoute, Link } from '@tanstack/react-router'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  api,
  type Balance,
  type Bill,
  formatCents,
  type Member,
  type Share,
} from '../api/client'
import { ShareRow } from '../components/ShareRow'

export const Route = createFileRoute('/homes/$homeId')({
  component: HomeDashboard,
})

function HomeDashboard() {
  const { homeId } = Route.useParams()

  // Home and member state
  const [homeName, setHomeName] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [bills, setBills] = useState<Bill[]>([])

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // Add member form state
  const [newMemberName, setNewMemberName] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState<string | null>(null)

  // Create bill form state
  const [billTitle, setBillTitle] = useState('')
  const [billDollarAmount, setBillDollarAmount] = useState('')
  const [isCreatingBill, setIsCreatingBill] = useState(false)
  const [createBillError, setCreateBillError] = useState<string | null>(null)

  // Fetch all dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    setDashboardError(null)

    try {
      const [homeRes, balancesRes, billsRes] = await Promise.all([
        api.getHome(homeId),
        api.getBalances(homeId),
        api.getBills(homeId),
      ])

      setHomeName(homeRes.name)
      setMembers(homeRes.members || [])
      setBalances(balancesRes.balances || [])
      setBills(billsRes.bills || [])
    } catch (err) {
      if (err instanceof ApiError) {
        setDashboardError(err.message)
      } else {
        setDashboardError('Failed to load dashboard data. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [homeId])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Handle adding a new member
  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault()
    const name = newMemberName.trim()
    if (!name) {
      setAddMemberError('Member name cannot be empty')
      return
    }

    setIsAddingMember(true)
    setAddMemberError(null)

    try {
      await api.addMember(homeId, name)
      setNewMemberName('')
      // Reload members and balances
      const [homeRes, balancesRes] = await Promise.all([
        api.getHome(homeId),
        api.getBalances(homeId),
      ])
      setMembers(homeRes.members || [])
      setBalances(balancesRes.balances || [])
    } catch (err) {
      if (err instanceof ApiError) {
        setAddMemberError(err.message)
      } else {
        setAddMemberError('Failed to add member. Please try again.')
      }
    } finally {
      setIsAddingMember(false)
    }
  }

  // Handle creating a bill
  const handleCreateBill = async (e: FormEvent) => {
    e.preventDefault()
    const title = billTitle.trim()
    if (!title) {
      setCreateBillError('Bill title is required')
      return
    }

    const dollars = Number.parseFloat(billDollarAmount)
    if (Number.isNaN(dollars) || dollars <= 0) {
      setCreateBillError('Please enter a valid positive dollar amount')
      return
    }

    const totalCents = Math.round(dollars * 100)
    if (totalCents <= 0) {
      setCreateBillError('Total amount must be at least 1 cent')
      return
    }

    if (members.length === 0) {
      setCreateBillError('Cannot split a bill for a home with zero members')
      return
    }

    setIsCreatingBill(true)
    setCreateBillError(null)

    try {
      await api.createBill(homeId, title, totalCents)
      setBillTitle('')
      setBillDollarAmount('')
      // Reload bills and balances
      const [billsRes, balancesRes] = await Promise.all([
        api.getBills(homeId),
        api.getBalances(homeId),
      ])
      setBills(billsRes.bills || [])
      setBalances(balancesRes.balances || [])
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateBillError(err.message)
      } else {
        setCreateBillError('Failed to create bill. Please try again.')
      }
    } finally {
      setIsCreatingBill(false)
    }
  }

  // Handle when a share is paid
  const handleSharePaid = async (_updatedShare: Share) => {
    try {
      const [billsRes, balancesRes] = await Promise.all([
        api.getBills(homeId),
        api.getBalances(homeId),
      ])
      setBills(billsRes.bills || [])
      setBalances(balancesRes.balances || [])
    } catch {
      // Background refresh failure does not crash the UI
    }
  }

  // Real-time split preview calculation
  const parsedPreviewDollars = Number.parseFloat(billDollarAmount)
  const previewTotalCents =
    !Number.isNaN(parsedPreviewDollars) && parsedPreviewDollars > 0
      ? Math.round(parsedPreviewDollars * 100)
      : 0

  const previewSplits =
    previewTotalCents > 0 && members.length > 0
      ? members.map((member, index) => {
          const base = Math.floor(previewTotalCents / members.length)
          const rem = previewTotalCents % members.length
          const shareCents = base + (index < rem ? 1 : 0)
          return {
            memberId: member.id,
            name: member.name,
            amountCents: shareCents,
          }
        })
      : []

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        <h2>Loading dashboard...</h2>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ← Back to All Homes
        </Link>
        <div
          style={{
            padding: '24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0' }}>Dashboard Error</h3>
          <p style={{ margin: '0 0 16px 0' }}>{dashboardError}</p>
          <button
            type="button"
            onClick={loadDashboardData}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '30px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* Navigation Header */}
      <nav style={{ marginBottom: '20px' }}>
        <Link
          to="/"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ← Back to All Homes
        </Link>
      </nav>

      {/* Home Header */}
      <header
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px 24px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
            {homeName}
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Home ID:{' '}
            <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
              {homeId}
            </code>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Refresh Data
        </button>
      </header>

      {/* Main Grid: Left Column (Members & Create Bill) | Right Column (Bills List) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Members & Balances Card */}
          <section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>
              Members & Balances
            </h2>

            {/* Add Member Form */}
            <form onSubmit={handleAddMember} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => {
                    setNewMemberName(e.target.value)
                    if (addMemberError) setAddMemberError(null)
                  }}
                  placeholder="New member name..."
                  disabled={isAddingMember}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
                <button
                  type="submit"
                  disabled={isAddingMember || !newMemberName.trim()}
                  style={{
                    backgroundColor:
                      isAddingMember || !newMemberName.trim() ? '#94a3b8' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isAddingMember || !newMemberName.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
              {addMemberError && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {addMemberError}
                </div>
              )}
            </form>

            {/* Members List State */}
            {members.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                No members yet. Add members above to start splitting bills.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((member, index) => {
                  const balance = balances.find((b) => b.memberId === member.id)
                  const owes = balance ? balance.outstandingCents : 0

                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: index === 0 ? '#fef3c7' : '#e2e8f0',
                            color: index === 0 ? '#92400e' : '#475569',
                          }}
                          title={
                            index === 0
                              ? 'First to receive remainder cent'
                              : `Priority #${index + 1}`
                          }
                        >
                          #{index + 1}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                          {member.name}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: owes > 0 ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {formatCents(owes)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {owes > 0 ? 'owes' : 'settled'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Create Bill Card */}
          <section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>Add a Bill</h2>

            <form onSubmit={handleCreateBill}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="bill-title-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#475569',
                    marginBottom: '4px',
                  }}
                >
                  Bill Description
                </label>
                <input
                  id="bill-title-input"
                  type="text"
                  value={billTitle}
                  onChange={(e) => {
                    setBillTitle(e.target.value)
                    if (createBillError) setCreateBillError(null)
                  }}
                  placeholder="e.g., Electricity, Internet, Dinner"
                  disabled={isCreatingBill}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="bill-amount-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#475569',
                    marginBottom: '4px',
                  }}
                >
                  Total Amount ($)
                </label>
                <input
                  id="bill-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={billDollarAmount}
                  onChange={(e) => {
                    setBillDollarAmount(e.target.value)
                    if (createBillError) setCreateBillError(null)
                  }}
                  placeholder="e.g., 25.50"
                  disabled={isCreatingBill}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Split Preview */}
              {previewSplits.length > 0 && (
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: '#166534',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Live Split Preview:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {previewSplits.map((p) => (
                      <div
                        key={p.memberId}
                        style={{ display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span>{p.name}:</span>
                        <span style={{ fontWeight: 600 }}>{formatCents(p.amountCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createBillError && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '12px' }}>
                  {createBillError}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isCreatingBill || members.length === 0 || !billTitle.trim() || !billDollarAmount
                }
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor:
                    isCreatingBill || members.length === 0 || !billTitle.trim() || !billDollarAmount
                      ? '#94a3b8'
                      : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor:
                    isCreatingBill || members.length === 0 || !billTitle.trim() || !billDollarAmount
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isCreatingBill ? 'Splitting Bill...' : 'Create & Split Bill'}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Bills & Shares List */}
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Bills & Shares</h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
            </span>
          </div>

          {/* Empty State */}
          {bills.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              No bills recorded yet. Add a bill using the form on the left.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bills.map((bill) => {
                const paidCount = bill.shares.filter((s) => s.paidAt !== null).length
                const totalShares = bill.shares.length

                return (
                  <div
                    key={bill.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                          {bill.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {paidCount} of {totalShares} shares paid
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatCents(bill.totalCents)}
                      </div>
                    </div>

                    {/* Shares Breakdown */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px',
                        }}
                      >
                        Shares
                      </div>
                      {bill.shares.map((share) => (
                        <ShareRow
                          key={share.id}
                          billId={bill.id}
                          share={share}
                          onPaid={handleSharePaid}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
