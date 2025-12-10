import type { VercelRequest, VercelResponse } from '@vercel/node';
import { saveGameState, initDatabase } from './database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize database on first request
    await initDatabase();

    const { username, gameState } = req.body;

    if (!username || !gameState) {
      return res.status(400).json({ success: false, error: 'Username and gameState are required' });
    }

    await saveGameState(username, gameState);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving game state:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

