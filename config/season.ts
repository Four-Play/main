// config/season.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central season configuration. Edit `SEASON_WEEKS` dates here when a week
// runs long or short — the rest of the app derives everything from this file.
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonWeek {
  week: number
  name: string           // Display name shown throughout the UI
  startDate: string      // YYYY-MM-DD (inclusive)
  endDate: string        // YYYY-MM-DD (inclusive) — adjust if week ends early/late
  placeholderCount: number  // How many TBD game cards to show before matchups are set
}

// ─── NFL 2026 SEASON ─────────────────────────────────────────────────────────
export const SEASON_WEEKS: SeasonWeek[] = [
  // Regular season — 18 weeks
  { week:  1, name: 'WK 1',       startDate: '2026-09-09', endDate: '2026-09-15', placeholderCount: 4 },
  { week:  2, name: 'WK 2',       startDate: '2026-09-16', endDate: '2026-09-22', placeholderCount: 4 },
  { week:  3, name: 'WK 3',       startDate: '2026-09-23', endDate: '2026-09-29', placeholderCount: 4 },
  { week:  4, name: 'WK 4',       startDate: '2026-09-30', endDate: '2026-10-06', placeholderCount: 4 },
  { week:  5, name: 'WK 5',       startDate: '2026-10-07', endDate: '2026-10-13', placeholderCount: 4 },
  { week:  6, name: 'WK 6',       startDate: '2026-10-14', endDate: '2026-10-20', placeholderCount: 4 },
  { week:  7, name: 'WK 7',       startDate: '2026-10-21', endDate: '2026-10-27', placeholderCount: 4 },
  { week:  8, name: 'WK 8',       startDate: '2026-10-28', endDate: '2026-11-03', placeholderCount: 4 },
  { week:  9, name: 'WK 9',       startDate: '2026-11-04', endDate: '2026-11-10', placeholderCount: 4 },
  { week: 10, name: 'WK 10',      startDate: '2026-11-11', endDate: '2026-11-17', placeholderCount: 4 },
  { week: 11, name: 'WK 11',      startDate: '2026-11-18', endDate: '2026-11-24', placeholderCount: 4 },
  { week: 12, name: 'WK 12',      startDate: '2026-11-25', endDate: '2026-12-01', placeholderCount: 4 },
  { week: 13, name: 'WK 13',      startDate: '2026-12-02', endDate: '2026-12-08', placeholderCount: 4 },
  { week: 14, name: 'WK 14',      startDate: '2026-12-09', endDate: '2026-12-15', placeholderCount: 4 },
  { week: 15, name: 'WK 15',      startDate: '2026-12-16', endDate: '2026-12-22', placeholderCount: 4 },
  { week: 16, name: 'WK 16',      startDate: '2026-12-23', endDate: '2026-12-29', placeholderCount: 4 },
  { week: 17, name: 'WK 17',      startDate: '2026-12-30', endDate: '2027-01-05', placeholderCount: 4 },
  { week: 18, name: 'WK 18',      startDate: '2027-01-06', endDate: '2027-01-12', placeholderCount: 4 },
  // Playoffs
  { week: 19, name: 'Wild Card',  startDate: '2027-01-09', endDate: '2027-01-12', placeholderCount: 4 },
  { week: 20, name: 'Divisional', startDate: '2027-01-16', endDate: '2027-01-19', placeholderCount: 4 },
  { week: 21, name: 'Conf. Champ.', startDate: '2027-01-23', endDate: '2027-01-26', placeholderCount: 2 },
  { week: 22, name: 'Super Bowl', startDate: '2027-02-06', endDate: '2027-02-09', placeholderCount: 1 },
]

export const SPORT_KEY = 'americanfootball_nfl'

export const SEASON_YEAR = 2026

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Returns the week number for today's date.
 * - Falls within a week's date range → that week number
 * - Before the season starts → week 1
 * - After the season ends → last week number
 */
export function getCurrentWeek(): number {
  const todayStr = new Date().toISOString().split('T')[0]

  for (const w of SEASON_WEEKS) {
    if (todayStr >= w.startDate && todayStr <= w.endDate) {
      return w.week
    }
  }

  if (todayStr < SEASON_WEEKS[0].startDate) return SEASON_WEEKS[0].week
  return SEASON_WEEKS[SEASON_WEEKS.length - 1].week
}

/** Returns the Odds API sport key for the current season */
export function getCurrentSportKey(): string {
  return SPORT_KEY
}

/**
 * Returns the display name for a given week number.
 * Falls back to "Week N" for any week not in the config.
 */
export function getWeekName(week: number): string {
  return SEASON_WEEKS.find(w => w.week === week)?.name ?? `Week ${week}`
}

/**
 * Returns how many TBD placeholder cards to show before matchups are announced.
 */
export function getPlaceholderCount(week: number): number {
  return SEASON_WEEKS.find(w => w.week === week)?.placeholderCount ?? 4
}
