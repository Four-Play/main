// src/types/database.ts

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
  
  export interface Pick {
    id: string;
    user_id: string;
    league_id: string;
    game_id: string;     // ID from the Sports API
    team_selected: string;
    is_locked: boolean;  // Can they still change it?
  }