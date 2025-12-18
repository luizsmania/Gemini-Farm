import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMatchHistory, initDatabase } from './database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ success: false, error: 'Player ID is required' });
    }

    // Try to initialize database, but don't fail if it already exists
    try {
      await initDatabase();
    } catch (initError: any) {
      // Ignore "already exists" errors, but log others
      if (!initError.message?.includes('already exists') && !initError.message?.includes('duplicate')) {
        console.warn('[match-history] Database init warning:', initError.message);
      }
    }

    console.log('[match-history] Fetching history for playerId:', playerId);
    
    try {
      const history = await getMatchHistory(playerId);
      console.log('[match-history] Found', history.length, 'matches');

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (dbError: any) {
      console.error('[match-history] Database query error:', dbError);
      console.error('[match-history] Error message:', dbError.message);
      console.error('[match-history] Error code:', dbError.code);
      
      // Return empty array if database is unavailable rather than 500
      if (dbError.message?.includes('connection') || dbError.message?.includes('timeout') || dbError.code === 'ECONNREFUSED') {
        console.warn('[match-history] Database unavailable, returning empty history');
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
      
      throw dbError; // Re-throw if it's a different error
    }
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

