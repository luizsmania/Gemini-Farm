import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadGameState, initDatabase } from './database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize database on first request
    await initDatabase();

    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const result = await loadGameState(username);

    if (!result) {
      return res.status(200).json({ success: false, error: 'No save data found' });
    }

    // Merge metadata into the response data structure
    const responseData: any = result.gameState;
    responseData.metadata = {
      lastSaved: result.lastSaved,
      updatedAt: result.updatedAt,
      version: result.version,
    };

    return res.status(200).json({ 
      success: true, 
      data: responseData
    });
  } catch (error) {
    console.error('Error loading game state:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

