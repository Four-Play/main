// src/services/leagueService.ts
// services/leagueService.ts
import { authFetch } from '@/lib/api'
import type { League } from '@/types/database'


export async function createLeague(
  name: string,
  _adminId: string,
  payoutPerLossCents: number = 5000
): Promise<League> {
  const res = await authFetch('/api/leagues/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, payoutPerLossCents }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create league')
  return data.league as League
}

export async function joinLeagueWithCode(
  inviteCode: string,
  _userId: string
): Promise<League> {
  const res = await authFetch('/api/leagues/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to join league')
  return data.league as League
}

export async function getMyLeagues(_userId: string): Promise<League[]> {
  const res = await authFetch('/api/leagues/mine')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to load leagues')
  return data.leagues as League[]
}


export async function updateLeague(
  leagueId: string,
  updates: Partial<Pick<League, 'name' | 'payout_per_loss_cents' | 'spread_cushion' | 'is_locked'>>
): Promise<League> {
  const res = await authFetch('/api/leagues/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, updates }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to update league')
  return data.league as League
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const res = await authFetch('/api/leagues/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to delete league')
}