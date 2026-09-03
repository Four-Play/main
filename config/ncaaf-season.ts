// config/ncaaf-season.ts
// College football (NCAAF) 2026 season configuration.
// Only Power 4 + Notre Dame matchups are eligible — NCAAF_ALLOWED_TEAMS enforces this.

import type { SeasonWeek } from '@/config/season'

export const NCAAF_SEASON_YEAR = 2026

// Regular season week dates are approximate — adjust if the schedule shifts.
export const NCAAF_SEASON_WEEKS: SeasonWeek[] = [
  { week:  1, name: 'WK 1',           startDate: '2026-08-28', endDate: '2026-09-01', placeholderCount: 4 },
  { week:  2, name: 'WK 2',           startDate: '2026-09-04', endDate: '2026-09-07', placeholderCount: 4 },
  { week:  3, name: 'WK 3',           startDate: '2026-09-11', endDate: '2026-09-14', placeholderCount: 4 },
  { week:  4, name: 'WK 4',           startDate: '2026-09-18', endDate: '2026-09-21', placeholderCount: 4 },
  { week:  5, name: 'WK 5',           startDate: '2026-09-25', endDate: '2026-09-28', placeholderCount: 4 },
  { week:  6, name: 'WK 6',           startDate: '2026-10-02', endDate: '2026-10-05', placeholderCount: 4 },
  { week:  7, name: 'WK 7',           startDate: '2026-10-09', endDate: '2026-10-12', placeholderCount: 4 },
  { week:  8, name: 'WK 8',           startDate: '2026-10-16', endDate: '2026-10-19', placeholderCount: 4 },
  { week:  9, name: 'WK 9',           startDate: '2026-10-23', endDate: '2026-10-26', placeholderCount: 4 },
  { week: 10, name: 'WK 10',          startDate: '2026-10-30', endDate: '2026-11-02', placeholderCount: 4 },
  { week: 11, name: 'WK 11',          startDate: '2026-11-06', endDate: '2026-11-09', placeholderCount: 4 },
  { week: 12, name: 'WK 12',          startDate: '2026-11-13', endDate: '2026-11-16', placeholderCount: 4 },
  { week: 13, name: 'WK 13',          startDate: '2026-11-20', endDate: '2026-11-23', placeholderCount: 4 },
  { week: 14, name: 'WK 14',          startDate: '2026-11-27', endDate: '2026-11-30', placeholderCount: 4 },
  { week: 15, name: 'Conf. Champs',   startDate: '2026-12-04', endDate: '2026-12-07', placeholderCount: 4 },
  { week: 16, name: 'CFP First Rd',   startDate: '2026-12-18', endDate: '2026-12-21', placeholderCount: 4 },
  { week: 17, name: 'CFP Quarters',   startDate: '2026-12-31', endDate: '2027-01-03', placeholderCount: 2 },
  { week: 18, name: 'CFP Semis',      startDate: '2027-01-08', endDate: '2027-01-10', placeholderCount: 2 },
  { week: 19, name: 'CFP Champ.',     startDate: '2027-01-19', endDate: '2027-01-19', placeholderCount: 1 },
]

export const NCAAF_PLAYOFF_RULES: Record<number, { cushion: number; picksRequired: number }> = {
  15: { cushion: 10, picksRequired: 4 }, // Conference Championships
  16: { cushion: 10, picksRequired: 4 }, // CFP First Round
  17: { cushion: 7,  picksRequired: 2 }, // CFP Quarterfinals
  18: { cushion: 3,  picksRequired: 2 }, // CFP Semifinals
  19: { cushion: 0,  picksRequired: 1 }, // CFP Championship
}

// Power 4 conferences + Notre Dame — any game where either team is not in this
// set is excluded from the slate. Names must match the Odds API format exactly
// (full school + mascot, e.g. "Ohio State Buckeyes" not "Ohio State").
export const NCAAF_ALLOWED_TEAMS = new Set<string>([
  // Big Ten (18 teams)
  'Illinois Fighting Illini',
  'Indiana Hoosiers',
  'Iowa Hawkeyes',
  'Maryland Terrapins',
  'Michigan Wolverines',
  'Michigan State Spartans',
  'Minnesota Golden Gophers',
  'Nebraska Cornhuskers',
  'Northwestern Wildcats',
  'Ohio State Buckeyes',
  'Oregon Ducks',
  'Penn State Nittany Lions',
  'Purdue Boilermakers',
  'Rutgers Scarlet Knights',
  'UCLA Bruins',
  'USC Trojans',
  'Washington Huskies',
  'Wisconsin Badgers',
  // SEC (16 teams)
  'Alabama Crimson Tide',
  'Arkansas Razorbacks',
  'Auburn Tigers',
  'Florida Gators',
  'Georgia Bulldogs',
  'Kentucky Wildcats',
  'LSU Tigers',
  'Mississippi State Bulldogs',
  'Missouri Tigers',
  'Oklahoma Sooners',
  'Ole Miss Rebels',
  'South Carolina Gamecocks',
  'Tennessee Volunteers',
  'Texas Longhorns',
  'Texas A&M Aggies',
  'Vanderbilt Commodores',
  // Big 12 (16 teams)
  'Arizona Wildcats',
  'Arizona State Sun Devils',
  'BYU Cougars',
  'Baylor Bears',
  'Cincinnati Bearcats',
  'Colorado Buffaloes',
  'Houston Cougars',
  'Iowa State Cyclones',
  'Kansas Jayhawks',
  'Kansas State Wildcats',
  'Oklahoma State Cowboys',
  'TCU Horned Frogs',
  'Texas Tech Red Raiders',
  'UCF Knights',
  'Utah Utes',
  'West Virginia Mountaineers',
  // ACC (17 teams)
  'Boston College Eagles',
  'California Golden Bears',
  'Clemson Tigers',
  'Duke Blue Devils',
  'Florida State Seminoles',
  'Georgia Tech Yellow Jackets',
  'Louisville Cardinals',
  'Miami Hurricanes',
  'NC State Wolfpack',
  'North Carolina Tar Heels',
  'Pittsburgh Panthers',
  'SMU Mustangs',
  'Stanford Cardinal',
  'Syracuse Orange',
  'Virginia Cavaliers',
  'Virginia Tech Hokies',
  'Wake Forest Demon Deacons',
  // Independent
  'Notre Dame Fighting Irish',
])
