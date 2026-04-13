// Shared week calculation utilities
// Used by both the API route (server) and the app page (client)
//
// NBA week boundaries come from config/season.ts (explicit date ranges per round).
// NFL weeks use a simple 7-day interval from the season start.

import {
  SEASON_WEEKS,
  getCurrentWeek as getNBACurrentWeek,
  getWeekName as getNBAWeekName,
} from '@/config/season'

export const ACTIVE_SPORT = 'basketball_nba'

/** Convert a UTC timestamp to a YYYY-MM-DD string in Eastern Time.
 *  Season config dates are ET-based, so all date comparisons must use ET. */
export function toETDateString(utcTime: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(utcTime))
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

interface SportConfig {
  /** ISO date string for the first day of Week 1 */
  seasonStart: string
  /** Year for DB season_year field */
  seasonYear: number
  /** Short label shown in the UI, e.g. "2026 NBA Playoffs" */
  displayName: string
  /** Tagline shown on the picks screen */
  tagline: string
  /** Optional per-week display labels. Falls back to "WK N" for unmapped weeks. */
  weekLabels?: Record<number, string>
}

export const SPORT_CONFIG: Record<string, SportConfig> = {
  americanfootball_nfl: {
    seasonStart: '2026-09-09',
    seasonYear: 2026,
    displayName: '2026 NFL Season',
    tagline: 'Pick 4 games against the spread and outlast your league.',
    // No weekLabels — NFL weeks are self-explanatory as WK 1, WK 2, etc.
  },
  basketball_nba: {
    // seasonStart is kept in sync with config/season.ts SEASON_WEEKS[0].startDate
    seasonStart: '2026-04-14',
    seasonYear: 2026,
    displayName: '2026 NBA Playoffs',
    tagline: 'Pick 4 playoff games against the spread. Every week counts.',
    // weekLabels derived from config/season.ts at runtime via getWeekLabel()
    weekLabels: Object.fromEntries(SEASON_WEEKS.map(w => [w.week, w.name])),
  },
}

/** Returns true if today is before the season start date */
export function isPreSeason(sportKey: string = ACTIVE_SPORT): boolean {
  const config = SPORT_CONFIG[sportKey]
  if (!config) return false
  return new Date() < new Date(config.seasonStart)
}

/**
 * Compute which week number a game belongs to based on its start time.
 * - NBA: uses explicit date ranges from config/season.ts (round-aware)
 * - NFL: 7-day intervals from the season start date
 */
export function computeWeekFromDate(commenceTime: string, sportKey: string = ACTIVE_SPORT): number {
  if (sportKey === 'basketball_nba') {
    // Use ET date — season config dates are ET-based, and late ET games
    // cross midnight in UTC which would assign them to the wrong day/week
    const dateStr = toETDateString(commenceTime)
    const match = SEASON_WEEKS.find(w => dateStr >= w.startDate && dateStr <= w.endDate)
    if (match) return match.week
    // If outside all date ranges, fall back to current week
    return getNBACurrentWeek()
  }
  // NFL: 7-day interval calculation
  const config = SPORT_CONFIG[sportKey]
  if (!config) return 1
  const startDate = new Date(config.seasonStart)
  const gameDate = new Date(commenceTime)
  const daysDiff = Math.floor((gameDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(daysDiff / 7) + 1)
}

/**
 * Get the display label for a given week number.
 * - NBA: returns the round name from config/season.ts (e.g. "Play-In", "First Round")
 * - NFL: falls back to "WK N"
 */
export function getWeekLabel(week: number, sportKey: string = ACTIVE_SPORT): string {
  if (sportKey === 'basketball_nba') {
    return getNBAWeekName(week)
  }
  const config = SPORT_CONFIG[sportKey]
  return config?.weekLabels?.[week] ?? `WK ${week}`
}

/**
 * Compute which week we are currently in based on today's date.
 * - NBA: uses explicit date ranges from config/season.ts
 * - NFL: 7-day intervals from the season start date
 */
export function computeCurrentWeek(sportKey: string = ACTIVE_SPORT): number {
  if (sportKey === 'basketball_nba') {
    return getNBACurrentWeek()
  }
  // NFL: 7-day interval calculation
  const config = SPORT_CONFIG[sportKey]
  if (!config) return 1
  const startDate = new Date(config.seasonStart)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(daysDiff / 7) + 1)
}
