// src/types/database.ts

export interface Game {
  id: string;          // e.g., "game_05"
  fav: string;         // Favorite team
  dog: string;         // Underdog team
  spread: number;      // e.g., -4.5
  time: string;        // Game start time/status
  result?: 'WIN' | 'LOSS' | 'PUSH';
}

export interface Profile {
    id: string;          // UUID from Supabase Auth
    username: string;    // Display name
    avatar_url?: string; 
    total_points: number;
  }
  
  export interface League {
    id: string;
    name: string;
    invite_code: string; // The 6-digit code friends use to join
    admin_id: string;    // The user who created it
  }

  export interface LeagueMember {
    league_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    league_points: number; // Their score specifically for THIS league
    w?: number; // Added as optional
    l?: number;
  }
  
  export interface Pick {
    id: string;
    user_id: string;
    league_id: string;
    game_id: string;     // ID from the Sports API
    team_selected: string;
    week_number: number;
    is_locked: boolean;  // Can they still change it?
    created_at: string; // Good for tie-breakers (who picked first?)
  }