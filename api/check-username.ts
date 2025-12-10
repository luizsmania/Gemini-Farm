import type { VercelRequest, VercelResponse } from '@vercel/node';
import { usernameExists, initDatabase } from './database.js';

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

    const exists = await usernameExists(username);

    return res.status(200).json({ success: true, data: { exists } });
  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

