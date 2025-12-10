import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllUsers, getUserByUsername, initDatabase } from '../database.js';

// Check if user is admin
async function isAdmin(username: string): Promise<boolean> {
  const user = await getUserByUsername(username);
  return user?.isAdmin || false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await initDatabase();

    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Check if user is admin
    if (!(await isAdmin(username))) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
    }

    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error getting users:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

