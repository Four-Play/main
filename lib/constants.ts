// src/lib/constants.ts

export interface Game {
    id: number;
    fav: string;
    dog: string;
    spread: number;
    time: string;
    result?: 'WIN' | 'LOSS' | 'PUSH';
  }
  
  export interface PlayerStats {
    name: string;
    w: number;
    l: number;
    p: number;
  }
  
  export const WEEKS = [1, 2];
  
  export const GAMES_CURRENT: Game[] = [
    { id: 5, fav: "Cowboys", dog: "Commanders", spread: -4.0, time: "MON 8:15 PM" },
    { id: 6, fav: "Ravens", dog: "Bengals", spread: -3.5, time: "SUN 1:00 PM" },
    { id: 7, fav: "Dolphins", dog: "Patriots", spread: -7.0, time: "SUN 1:00 PM" },
    { id: 8, fav: "Vikings", dog: "Packers", spread: -1.5, time: "SUN 4:25 PM" },
    { id: 9, fav: "Lions", dog: "Texans", spread: -.5, time: "SUN 7:15 PM" },
  ];
  
  export const GAMES_HISTORY: Game[] = [
    { id: 1, fav: "Chiefs", dog: "Raiders", spread: -7.5, time: "FINAL", result: "WIN" },
    { id: 2, fav: "Eagles", dog: "Giants", spread: -3.0, time: "FINAL", result: "WIN" },
    { id: 3, fav: "Bills", dog: "Jets", spread: -10.5, time: "FINAL", result: "LOSS" },
    { id: 4, fav: "Lions", dog: "Bears", spread: -6.0, time: "FINAL", result: "WIN" },
  ];
  
  export const PAST_PICKS = [1, 2, 3, 4];
  
  export const LEAGUE_STANDINGS: Record<string, PlayerStats[]> = {
    "The Degenerates": [
      { name: "You", w: 3, l: 1, p: 150 },
      { name: "Darnell", w: 2, l: 2, p: 40 },
      { name: "Sarah", w: 1, l: 3, p: -80 },
    ],
    "Work Pool 2026": [
      { name: "Boss Mike", w: 4, l: 0, p: 400 },
      { name: "You", w: 2, l: 2, p: 20 },
      { name: "Linda", w: 0, l: 4, p: -200 },
    ],
  };