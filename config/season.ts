// config/season.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central season configuration. Edit `SEASON_WEEKS` dates here when playoff
// rounds end early or run long — the rest of the app derives everything from
// this single file.
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonWeek {
  week: number
  name: string       // Display name shown throughout the UI
  startDate: string  // YYYY-MM-DD (inclusive)
  endDate: string    // YYYY-MM-DD (inclusive) — adjust if round ends early/late
}

// ─── NBA PLAYOFFS 2026 ───────────────────────────────────────────────────────
export const SEASON_WEEKS: SeasonWeek[] = [
  { week: 1, name: 'Play-In',          startDate: '2026-04-14', endDate: '2026-04-17' },
  { week: 2, name: 'First Round',      startDate: '2026-04-19', endDate: '2026-04-28' },
  { week: 3, name: 'Conf. Semis',      startDate: '2026-04-29', endDate: '2026-05-12' },
  { week: 4, name: 'Conf. Finals',     startDate: '2026-05-13', endDate: '2026-05-26' },
  { week: 5, name: 'NBA Finals',       startDate: '2026-05-29', endDate: '2026-06-22' },
]

// Switch to 'americanfootball_nfl' in September when the NFL season begins
export const SPORT_KEY = 'basketball_nba'

export const SEASON_YEAR = 2026

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Returns the week number for today's date.
 * - Falls within a round's date range → that round's week number
 * - Before the season starts → week 1
 * - After the season ends → last week number
 */
export function getCurrentWeek(): number {
  // Compare as YYYY-MM-DD strings for simple, timezone-safe comparison
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
 * Returns the round display name for a given week number.
 * Falls back to "Week N" for any week not in the config.
 */
export function getWeekName(week: number): string {
  return SEASON_WEEKS.find(w => w.week === week)?.name ?? `Week ${week}`
}
