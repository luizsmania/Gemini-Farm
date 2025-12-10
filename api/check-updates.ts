import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGameStateMetadata, initDatabase } from './database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize database on first request
    await initDatabase();

    const { username, lastKnownVersion, lastKnownUpdatedAt } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const metadata = await getGameStateMetadata(username);

    if (!metadata) {
      return res.status(200).json({ 
        success: true, 
        data: { 
          hasUpdates: false,
          message: 'No save data found on server'
        } 
      });
    }

    // Check if there are updates by comparing version or updatedAt
    const clientVersion = lastKnownVersion ? parseInt(lastKnownVersion as string) : 0;
    const clientUpdatedAt = lastKnownUpdatedAt ? parseInt(lastKnownUpdatedAt as string) : 0;
    
    const hasUpdates = metadata.version > clientVersion || metadata.updatedAt > clientUpdatedAt;

    return res.status(200).json({ 
      success: true, 
      data: {
        hasUpdates,
        serverVersion: metadata.version,
        serverUpdatedAt: metadata.updatedAt,
        clientVersion,
        clientUpdatedAt,
        lastSaved: metadata.lastSaved,
      }
    });
  } catch (error) {
    console.error('Error checking updates:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

