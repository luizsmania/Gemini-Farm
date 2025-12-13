import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { GameState } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const usernameLower = username.toLowerCase().trim();

    // Get game state for the requested user
    const result = await sql`
      SELECT gs.game_state, u.username, u.created_at
      FROM game_states gs
      JOIN users u ON u.username_lower = gs.username_lower
      WHERE gs.username_lower = ${usernameLower}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const row = result.rows[0];
    const gameState = typeof row.game_state === 'string' 
      ? JSON.parse(row.game_state) 
      : row.game_state;

    if (!gameState) {
      return res.status(404).json({ success: false, error: 'Player has no game state' });
    }

    // Return public information only (no sensitive data)
    const publicState = {
      username: row.username,
      createdAt: row.created_at,
      level: gameState.level || 1,
      coins: gameState.coins || 0,
      xp: gameState.xp || 0,
      prestigeLevel: gameState.prestigeLevel || 0,
      prestigePoints: gameState.prestigePoints || 0,
      plots: gameState.plots || [],
      decorations: gameState.decorations || [],
      statistics: gameState.statistics || {},
      inventory: gameState.inventory || {},
      harvested: gameState.harvested || {},
      missions: gameState.missions || [],
      achievements: gameState.achievements || []
    };

    return res.status(200).json({
      success: true,
      data: publicState
    });
  } catch (error) {
    console.error('Error fetching player state:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


