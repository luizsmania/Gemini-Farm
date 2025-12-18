import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMatchHistory } from './database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ success: false, error: 'Player ID is required' });
    }

    const history = await getMatchHistory(playerId);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Error getting match history:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

