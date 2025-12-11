import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { LeaderboardEntry } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { category = 'coins', limit = '100' } = req.query;
    const limitNum = parseInt(limit as string, 10) || 100;

    // Get all game states from database
    const result = await sql`
      SELECT gs.game_state, u.username
      FROM game_states gs
      JOIN users u ON u.username_lower = gs.username_lower
      WHERE gs.game_state IS NOT NULL
    `;
    const users = result.rows;

    const leaderboard: LeaderboardEntry[] = [];

    for (const user of users) {
      try {
        const gameState = typeof user.game_state === 'string' 
          ? JSON.parse(user.game_state) 
          : user.game_state;

        if (!gameState) continue;

        let score = 0;
        const level = gameState.level || 1;
        const coins = gameState.coins || 0;
        const prestigeLevel = gameState.prestigeLevel || 0;

        switch (category) {
          case 'coins':
            score = coins;
            break;
          case 'level':
            score = level + (prestigeLevel * 1000); // Prestige gives huge boost
            break;
          case 'prestige':
            score = prestigeLevel;
            break;
          case 'total_harvested':
            const stats = gameState.statistics || {};
            const totalHarvested = stats.totalHarvested || {};
            score = Object.values(totalHarvested).reduce((sum: number, val: any) => sum + (val || 0), 0);
            break;
          default:
            score = coins;
        }

        leaderboard.push({
          username: user.username,
          rank: 0, // Will be set after sorting
          score,
          level,
          coins,
          prestigeLevel,
          category: category as 'coins' | 'level' | 'prestige' | 'total_harvested'
        });
      } catch (error) {
        console.error(`Error processing user ${user.username}:`, error);
        continue;
      }
    }

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Return top N entries
    const topEntries = leaderboard.slice(0, limitNum);

    return res.status(200).json({
      success: true,
      data: topEntries,
      category,
      total: leaderboard.length
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

