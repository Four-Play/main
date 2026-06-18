// Shared week calculation utilities
// Week boundaries come from config/season.ts (explicit date ranges per week).

import { SEASON_WEEKS } from '@/config/season'

export const ACTIVE_SPORT = 'americanfootball_nfl'

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
  seasonStart: string
  seasonYear: number
  displayName: string
  tagline: string
  weekLabels?: Record<number, string>
}

export const SPORT_CONFIG: Record<string, SportConfig> = {
  americanfootball_nfl: {
    seasonStart: '2026-09-09',
    seasonYear: 2026,
    displayName: '2026 NFL Season',
    tagline: 'Pick 4 games against the spread and outlast your league.',
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
 * Uses explicit date ranges from config/season.ts (SEASON_WEEKS).
 */
export function computeWeekFromDate(commenceTime: string, sportKey: string = ACTIVE_SPORT): number {
  const dateStr = toETDateString(commenceTime)
  const match = SEASON_WEEKS.find(w => dateStr >= w.startDate && dateStr <= w.endDate)
  if (match) return match.week
  if (SEASON_WEEKS.length === 0) return 1
  if (dateStr < SEASON_WEEKS[0].startDate) return SEASON_WEEKS[0].week
  return SEASON_WEEKS[SEASON_WEEKS.length - 1].week
}

/**
 * Get the display label for a given week number.
 * Returns the week name from SEASON_WEEKS, falling back to "WK N".
 */
export function getWeekLabel(week: number, sportKey: string = ACTIVE_SPORT): string {
  return SEASON_WEEKS.find(w => w.week === week)?.name ?? `WK ${week}`
}

/**
 * Compute which week we are currently in based on today's date (ET).
 */
export function computeCurrentWeek(sportKey: string = ACTIVE_SPORT): number {
  const todayStr = toETDateString(new Date().toISOString())
  for (const w of SEASON_WEEKS) {
    if (todayStr >= w.startDate && todayStr <= w.endDate) return w.week
  }
  if (SEASON_WEEKS.length === 0) return 1
  if (todayStr < SEASON_WEEKS[0].startDate) return SEASON_WEEKS[0].week
  return SEASON_WEEKS[SEASON_WEEKS.length - 1].week
}
