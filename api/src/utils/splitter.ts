import type { SplitResult } from '../types'

/**
 * Splits totalCents among members in the exact order provided.
 * Integer division is used: Math.floor(totalCents / members.length).
 * The remainder (totalCents % members.length) is distributed one cent at a time
 * to the earliest members (index < remainder).
 */
export function splitCentsEqually(totalCents: number, memberIds: string[]): SplitResult[] {
  const memberCount = memberIds.length
  if (memberCount === 0) {
    throw new Error('Cannot split among zero members')
  }

  const baseShare = Math.floor(totalCents / memberCount)
  const remainder = totalCents % memberCount

  return memberIds.map((memberId, index) => ({
    memberId,
    amountCents: baseShare + (index < remainder ? 1 : 0),
  }))
}
