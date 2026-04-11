// src/types/database.ts

// types/database.ts - Replace your existing file with this

export interface Profile {
  id: string
  username: string
  avatar_url?: string
  total_points: number
  created_at?: string
}

export interface League {
  id: string
  name: string
  invite_code: string
  admin_id: string
  entry_fee_cents: number
  payout_per_loss_cents: number
  spread_cushion: number
  is_locked?: boolean
  created_at?: string
}

export interface LeagueMember {
  id: string
  league_id: string
  user_id: string
  role: 'admin' | 'member'
  league_points: number
  wins: number
  losses: number
  total_owed_cents: number
  joined_at?: string
  // Joined from profiles table
  profile?: Profile
}

export interface Game {
  id: string
  external_id?: string
  home_team?: string
  away_team?: string
  favorite_team?: string
  underdog_team?: string
  spread: number
  commence_time?: string
  nfl_week?: number
  season_year?: number
  home_score?: number
  away_score?: number
  status?: 'upcoming' | 'live' | 'final'
  // Computed for display
  fav?: string
  dog?: string
  time?: string
  result?: 'WIN' | 'LOSS' | 'PUSH'
}

export interface Pick {
  id: string
  user_id: string
  league_id: string
  game_id: string
  team_selected: string
  is_locked: boolean
  result?: 'win' | 'loss' | 'push' | null
  nfl_week: number
  season_year: number
  created_at?: string
  // Joined
  game?: Game
}

export interface WeeklyResult {
  id: string
  user_id: string
  league_id: string
  nfl_week: number
  season_year: number
  picks_correct: number
  is_winner: boolean
  amount_won_cents: number
  amount_owed_cents: number
  calculated_at?: string
  // Joined
  profile?: Profile
}

// Scoring logic
export interface WeekSummary {
  week: number
  year: number
  winners: WeeklyResult[]
  losers: WeeklyResult[]
  prizePerWinner: number
  isFinal: boolean
}

// Utility: format cents to dollar string
export function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const str = `$${(abs / 100).toFixed(2)}`
  return cents < 0 ? `-${str}` : str
}