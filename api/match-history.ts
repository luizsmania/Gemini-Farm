import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMatchHistory, initDatabase } from './database';
import logger from '../utils/logger.js';

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ success: false, error: 'Player ID is required' });
    }
    
    // Validate UUID format
    if (!isValidUUID(playerId)) {
      return res.status(400).json({ success: false, error: 'Invalid player ID format' });
    }

    // Try to initialize database, but don't fail if it already exists
    try {
      await initDatabase();
    } catch (initError: any) {
      // Ignore "already exists" errors, but log others
      if (!initError.message?.includes('already exists') && !initError.message?.includes('duplicate')) {
        logger.warn('[match-history] Database init warning', { error: initError.message });
      }
    }

    logger.info('[match-history] Fetching history', { playerId });
    
    try {
      const history = await getMatchHistory(playerId);
      logger.info('[match-history] Found matches', { playerId, count: history.length });

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (dbError: any) {
      logger.error('[match-history] Database query error', { 
        playerId, 
        error: dbError.message, 
        code: dbError.code,
        stack: dbError.stack 
      });
      
      // Return empty array if database is unavailable rather than 500
      if (dbError.message?.includes('connection') || dbError.message?.includes('timeout') || dbError.code === 'ECONNREFUSED') {
        logger.warn('[match-history] Database unavailable, returning empty history', { playerId });
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
      
      throw dbError; // Re-throw if it's a different error
    }
  } catch (error: any) {
    logger.error('[match-history] Error getting match history', { 
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack 
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

