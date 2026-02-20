// src/services/leagueService.ts
import { League } from '../types/database';

export const joinLeagueWithCode = async (code: string): Promise<League | null> => {
  console.log("Checking code:", code);
  await new Promise(res => setTimeout(res, 1000));

  if (code === "1234") {
    return {
      id: 'league-abc',
      name: 'The Degenerates',
      invite_code: '1234',
      admin_id: 'user-99'
    };
  }
  throw new Error("Invalid Invite Code");
};

export const createLeague = async (name: string): Promise<League | null> => {
  console.log("Creating league:", name);
  
  // Simulate network delay
  await new Promise(res => setTimeout(res, 1000));

  if (!name || name.length < 3) {
    throw new Error("League name must be at least 3 characters");
  }

  // In a real app, this would be a database INSERT
  return {
    id: `league-${Math.random().toString(36).substr(2, 9)}`,
    name: name,
    invite_code: Math.floor(1000 + Math.random() * 9000).toString(), // Random 4-digit code
    admin_id: 'user-current'
  };
};