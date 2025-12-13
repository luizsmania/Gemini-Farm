import { LeaderboardEntry } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface LeaderboardResponse {
  success: boolean;
  data?: LeaderboardEntry[];
  category?: string;
  total?: number;
  error?: string;
}

export const fetchLeaderboard = async (
  category: 'coins' | 'level' | 'prestige' | 'total_harvested' = 'coins',
  limit: number = 100
): Promise<LeaderboardEntry[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/leaderboard?category=${category}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    const result: LeaderboardResponse = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

export const getPlayerRank = async (
  username: string,
  category: 'coins' | 'level' | 'prestige' | 'total_harvested' = 'coins'
): Promise<number | null> => {
  try {
    const leaderboard = await fetchLeaderboard(category, 1000);
    const playerEntry = leaderboard.find(entry => entry.username === username);
    return playerEntry ? playerEntry.rank : null;
  } catch (error) {
    console.error('Error getting player rank:', error);
    return null;
  }
};




