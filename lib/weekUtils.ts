// Shared week calculation utilities
// Used by both the API route (server) and the app page (client)

export const ACTIVE_SPORT = 'basketball_nba'

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
    seasonStart: '2026-04-14',
    seasonYear: 2026,
    displayName: '2026 NBA Playoffs',
    tagline: 'Pick 4 playoff games against the spread. Every week counts.',
    weekLabels: {
      1: 'Play-In',
      2: 'Round 1',
      3: 'Round 1',
      4: 'Round 1',
      5: 'Conf Semis',
      6: 'Conf Finals',
      7: 'Conf Finals',
      8: 'Finals',
      9: 'Finals',
    },
  },
}

/** Returns true if today is before the season start date */
export function isPreSeason(sportKey: string = ACTIVE_SPORT): boolean {
  const config = SPORT_CONFIG[sportKey]
  if (!config) return false
  return new Date() < new Date(config.seasonStart)
}

/** Compute which week number a game belongs to based on its start time */
export function computeWeekFromDate(commenceTime: string, sportKey: string = ACTIVE_SPORT): number {
  const config = SPORT_CONFIG[sportKey]
  if (!config) return 1
  const startDate = new Date(config.seasonStart)
  const gameDate = new Date(commenceTime)
  const daysDiff = Math.floor((gameDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(daysDiff / 7) + 1)
}

/** Get the display label for a given week number (e.g. "Play-In", "Round 1", "WK 3") */
export function getWeekLabel(week: number, sportKey: string = ACTIVE_SPORT): string {
  const config = SPORT_CONFIG[sportKey]
  return config?.weekLabels?.[week] ?? `WK ${week}`
}

/** Compute which week we are currently in based on today's date */
export function computeCurrentWeek(sportKey: string = ACTIVE_SPORT): number {
  const config = SPORT_CONFIG[sportKey]
  if (!config) return 1
  const startDate = new Date(config.seasonStart)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(daysDiff / 7) + 1)
}
