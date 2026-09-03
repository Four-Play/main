// Shared week calculation utilities
// Week boundaries come from config/season.ts (explicit date ranges per week).

import { SEASON_WEEKS, PLAYOFF_RULES, SEASON_YEAR } from '@/config/season'
import { NCAAF_SEASON_WEEKS, NCAAF_PLAYOFF_RULES, NCAAF_SEASON_YEAR } from '@/config/ncaaf-season'
import type { SeasonWeek } from '@/config/season'

export const ACTIVE_SPORT = 'americanfootball_nfl'
export const NCAAF_SPORT  = 'americanfootball_ncaaf'

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
    tagline: 'Go 4-for-4 each week with a +13 cushion — one wrong pick and you lose the round.',
  },
  americanfootball_ncaaf: {
    seasonStart: '2026-08-28',
    seasonYear: 2026,
    displayName: '2026 College Football',
    tagline: 'Pick Power 4 matchups each week — one wrong pick and you lose the round.',
  },
}

/** Returns the season weeks array for a given sport key. */
export function getSeasonWeeks(sportKey: string = ACTIVE_SPORT): SeasonWeek[] {
  return sportKey === NCAAF_SPORT ? NCAAF_SEASON_WEEKS : SEASON_WEEKS
}

/** Returns the playoff rules for a given sport key. */
export function getPlayoffRules(sportKey: string = ACTIVE_SPORT): Record<number, { cushion: number; picksRequired: number }> {
  return sportKey === NCAAF_SPORT ? NCAAF_PLAYOFF_RULES : PLAYOFF_RULES
}

/** Returns the season year for a given sport key. */
export function getSeasonYear(sportKey: string = ACTIVE_SPORT): number {
  return sportKey === NCAAF_SPORT ? NCAAF_SEASON_YEAR : SEASON_YEAR
}

/** Returns true if today is before the season start date */
export function isPreSeason(sportKey: string = ACTIVE_SPORT): boolean {
  const config = SPORT_CONFIG[sportKey]
  if (!config) return false
  return new Date() < new Date(config.seasonStart)
}

/**
 * Compute which week number a game belongs to based on its start time.
 * Uses explicit date ranges from the sport's season config.
 */
export function computeWeekFromDate(commenceTime: string, sportKey: string = ACTIVE_SPORT): number {
  const weeks = getSeasonWeeks(sportKey)
  const dateStr = toETDateString(commenceTime)
  const match = weeks.find(w => dateStr >= w.startDate && dateStr <= w.endDate)
  if (match) return match.week
  if (weeks.length === 0) return 1
  if (dateStr < weeks[0].startDate) return weeks[0].week
  return weeks[weeks.length - 1].week
}

/**
 * Get the display label for a given week number.
 */
export function getWeekLabel(week: number, sportKey: string = ACTIVE_SPORT): string {
  return getSeasonWeeks(sportKey).find(w => w.week === week)?.name ?? `WK ${week}`
}

/**
 * Compute which week we are currently in based on today's date (ET).
 */
export function computeCurrentWeek(sportKey: string = ACTIVE_SPORT): number {
  const weeks = getSeasonWeeks(sportKey)
  const todayStr = toETDateString(new Date().toISOString())
  for (const w of weeks) {
    if (todayStr >= w.startDate && todayStr <= w.endDate) return w.week
  }
  if (weeks.length === 0) return 1
  if (todayStr < weeks[0].startDate) return weeks[0].week
  // Between weeks (e.g. gap days between college football weeks):
  // return the next upcoming week rather than jumping to the last week.
  const nextWeek = weeks.find(w => w.startDate > todayStr)
  if (nextWeek) return nextWeek.week
  return weeks[weeks.length - 1].week
}
