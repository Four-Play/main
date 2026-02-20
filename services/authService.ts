// src/services/authService.ts
import { Profile } from '../types/database';

export const mockSignIn = async (email: string): Promise<Profile> => {
  // Simulate a network delay
  await new Promise(res => setTimeout(res, 800)); 
  
  return {
    id: 'user-123',
    username: email.split('@')[0],
    total_points: 0
  };
};