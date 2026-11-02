import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { ApiError, api, type Home } from '../api/client'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()

  // Create home state
  const [newHomeName, setNewHomeName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Jump to home state
  const [jumpHomeId, setJumpHomeId] = useState('')
  const [jumpError, setJumpError] = useState<string | null>(null)

  // Recent homes list state
  const [recentHomes, setRecentHomes] = useState<Home[]>([])
  const [isLoadingHomes, setIsLoadingHomes] = useState(true)
  const [homesError, setHomesError] = useState<string | null>(null)

  const fetchHomes = useCallback(async () => {
    setIsLoadingHomes(true)
    setHomesError(null)
    try {
      const response = await api.getHomes()
      setRecentHomes(response.homes || [])
    } catch (err) {
      if (err instanceof ApiError) {
        setHomesError(err.message)
      } else {
        setHomesError('Failed to load recent homes.')
      }
    } finally {
      setIsLoadingHomes(false)
    }
  }, [])

  useEffect(() => {
    fetchHomes()
  }, [fetchHomes])

  const handleCreateHome = async (e: FormEvent) => {
    e.preventDefault()
    if (!newHomeName.trim()) {
      setCreateError('Home name cannot be empty')
      return
    }

    setIsCreating(true)
    setCreateError(null)
    try {
      const created = await api.createHome(newHomeName.trim())
      navigate({ to: `/homes/${created.id}` })
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message)
      } else {
        setCreateError('Failed to create home. Please try again.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleJumpHome = (e: FormEvent) => {
    e.preventDefault()
    const id = jumpHomeId.trim()
    if (!id) {
      setJumpError('Please enter a valid Home ID')
      return
    }
    navigate({ to: `/homes/${id}` })
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#0f172a',
      }}
    >
      <header style={{ marginBottom: '36px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
          Shared Bill Splitter
        </h1>
        <p style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>
          Fair, cent-accurate bill splitting with automated remainder distribution.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '36px',
        }}
      >
        {/* Create Home Card */}
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
            Create a New Home
          </h2>
          <form onSubmit={handleCreateHome}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="home-name-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Home Name
              </label>
              <input
                id="home-name-input"
                type="text"
                value={newHomeName}
                onChange={(e) => {
                  setNewHomeName(e.target.value)
                  if (createError) setCreateError(null)
                }}
                placeholder="e.g., Flat 4B, Baker St Apt"
                disabled={isCreating}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
              {createError && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {createError}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreating || !newHomeName.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: isCreating || !newHomeName.trim() ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isCreating || !newHomeName.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isCreating ? 'Creating Home...' : 'Create Home'}
            </button>
          </form>
        </section>

        {/* Jump to Home by ID Card */}
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
            Open Existing Home
          </h2>
          <form onSubmit={handleJumpHome}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="home-id-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Home ID
              </label>
              <input
                id="home-id-input"
                type="text"
                value={jumpHomeId}
                onChange={(e) => {
                  setJumpHomeId(e.target.value)
                  if (jumpError) setJumpError(null)
                }}
                placeholder="Paste Home UUID"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
              {jumpError && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {jumpError}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!jumpHomeId.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: !jumpHomeId.trim() ? '#94a3b8' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: !jumpHomeId.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Go to Home
            </button>
          </form>
        </section>
      </div>

      {/* Recent Homes Section */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
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
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Recent Homes</h2>
          <button
            type="button"
            onClick={fetchHomes}
            disabled={isLoadingHomes}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {isLoadingHomes ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Loading State */}
        {isLoadingHomes && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Loading homes...
          </div>
        )}

        {/* Error State */}
        {!isLoadingHomes && homesError && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{homesError}</span>
            <button
              type="button"
              onClick={fetchHomes}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingHomes && !homesError && recentHomes.length === 0 && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            No homes found yet. Create your first home above!
          </div>
        )}

        {/* Homes List */}
        {!isLoadingHomes && !homesError && recentHomes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentHomes.map((home) => (
              <div
                key={home.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                    {home.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {home.id}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate({ to: `/homes/${home.id}` })}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#2563eb',
                    border: '1px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  View Dashboard →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
