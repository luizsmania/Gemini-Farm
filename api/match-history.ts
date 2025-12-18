import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMatchHistory, initDatabase } from './database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Ensure database is initialized
    try {
      await initDatabase();
    } catch (initError: any) {
      console.warn('[match-history] Database init warning (may already exist):', initError.message);
      // Continue anyway - tables might already exist
    }

    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ success: false, error: 'Player ID is required' });
    }

    console.log('[match-history] Fetching history for playerId:', playerId);
    const history = await getMatchHistory(playerId);
    console.log('[match-history] Found', history.length, 'matches');

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[match-history] Error getting match history:', error);
    console.error('[match-history] Error name:', error.name);
    console.error('[match-history] Error message:', error.message);
    if (error.stack) {
      console.error('[match-history] Error stack:', error.stack);
    }
    if (error.code) {
      console.error('[match-history] Error code:', error.code);
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

