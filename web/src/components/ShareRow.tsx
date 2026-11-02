import { useState } from 'react'
import { ApiError, api, formatCents, type Share } from '../api/client'

interface ShareRowProps {
  billId: string
  share: Share
  onPaid?: (updated: Share) => void
}

export function ShareRow({ billId, share, onPaid }: ShareRowProps) {
  const [paidAt, setPaidAt] = useState<string | null>(share.paidAt)
  const [isPaying, setIsPaying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePay = async () => {
    setIsPaying(true)
    setErrorMessage(null)

    try {
      const idempotencyKey = crypto.randomUUID()
      const updated = await api.payShare(billId, share.id, idempotencyKey)
      setPaidAt(updated.paidAt)
      onPaid?.(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Payment failed. Please try again.')
      }
    } finally {
      setIsPaying(false)
    }
  }

  const isPaid = paidAt !== null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: isPaid ? '#f8fafc' : '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        marginBottom: '8px',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          {share.memberName || `Member (${share.memberId.slice(0, 8)})`}
        </span>
        <span
          style={{
            fontSize: '14px',
            color: '#475569',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatCents(share.amountCents)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        {isPaid ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ✓ Paid
          </span>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={isPaying}
            style={{
              backgroundColor: isPaying ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isPaying ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isPaying ? 'Processing...' : 'Pay Share'}
          </button>
        )}

        {errorMessage && (
          <span
            style={{
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 500,
              maxWidth: '240px',
              textAlign: 'right',
            }}
          >
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  )
}
