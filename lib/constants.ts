// src/lib/constants.ts
import { Game, Profile, LeagueMember } from '@/types/database';

export const WEEKS = [1, 2];

// 1. Updated Game IDs to strings
export const GAMES_CURRENT: Game[] = [
  { id: "game_05", fav: "Cowboys", dog: "Commanders", spread: -4.0, time: "MON 8:15 PM" },
  { id: "game_06", fav: "Ravens", dog: "Bengals", spread: -3.5, time: "SUN 1:00 PM" },
  { id: "game_07", fav: "Dolphins", dog: "Patriots", spread: -7.0, time: "SUN 1:00 PM" },
  { id: "game_08", fav: "Vikings", dog: "Packers", spread: -1.5, time: "SUN 4:25 PM" },
  { id: "game_09", fav: "Lions", dog: "Texans", spread: -0.5, time: "SUN 7:15 PM" },
];

export const GAMES_HISTORY: Game[] = [
  { id: "game_01", fav: "Chiefs", dog: "Raiders", spread: -7.5, time: "FINAL", result: "WIN" },
  { id: "game_02", fav: "Eagles", dog: "Giants", spread: -3.0, time: "FINAL", result: "WIN" },
  { id: "game_03", fav: "Bills", dog: "Jets", spread: -10.5, time: "FINAL", result: "LOSS" },
  { id: "game_04", fav: "Lions", dog: "Bears", spread: -6.0, time: "FINAL", result: "WIN" },
];

// 2. Updated to string IDs
export const PAST_PICKS: string[] = ["game_01", "game_02", "game_03", "game_04"];

// 3. Mock Profiles (to simulate the 'profiles' table)
export const MOCK_PROFILES: Record<string, Profile> = {
  "user_me": { id: "user_me", username: "You", total_points: 170 },
  "user_01": { id: "user_01", username: "Darnell", total_points: 40 },
  "user_02": { id: "user_02", username: "Sarah", total_points: -80 },
  "user_03": { id: "user_03", username: "Eddie", total_points: -800 },
  "user_04": { id: "user_04", username: "Kenton", total_points: 160 },
  "user_05": { id: "user_05", username: "Matthew", total_points: 60 },
  "user_admin": { id: "user_admin", username: "Boss Mike", total_points: 400 },
};

// 4. Mock Memberships (to simulate the 'league_members' junction table)
// This structure maps League Name -> Array of Member objects
export const LEAGUE_MEMBERSHIPS: Record<string, LeagueMember[]> = {
  "The Degenerates": [
    { league_id: "l_01", user_id: "user_me", role: 'member', joined_at: '2024-01-01', league_points: 150, },
    { league_id: "l_01", user_id: "user_01", role: 'admin', joined_at: '2024-01-01', league_points: 40 },
    { league_id: "l_01", user_id: "user_02", role: 'member', joined_at: '2024-01-01', league_points: -80 },
  ],
  "Work Pool 2026": [
    { league_id: "l_02", user_id: "user_admin", role: 'admin', joined_at: '2024-01-01', league_points: 400 },
    { league_id: "l_02", user_id: "user_me", role: 'member', joined_at: '2024-01-01', league_points: 200 },
    { league_id: "l_02", user_id: "user_03", role: 'member', joined_at: '2024-01-01', league_points: 250 },
    { league_id: "l_02", user_id: "user_04", role: 'member', joined_at: '2024-01-01', league_points: 100 },
    { league_id: "l_02", user_id: "user_05", role: 'member', joined_at: '2024-01-01', league_points: -60 },
  ],
};