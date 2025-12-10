import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserByUsername, loadGameState, updateUserAdminStatus, updateUserGameState, initDatabase } from '../database.js';

// Check if user is admin
async function isAdmin(username: string): Promise<boolean> {
  const user = await getUserByUsername(username);
  return user?.isAdmin || false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDatabase();

    const { adminUsername, targetUsername } = req.query;

    if (!adminUsername || typeof adminUsername !== 'string') {
      return res.status(400).json({ success: false, error: 'Admin username is required' });
    }

    // Check if user is admin
    if (!(await isAdmin(adminUsername))) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
    }

    if (req.method === 'GET') {
      // Get user info
      if (!targetUsername || typeof targetUsername !== 'string') {
        return res.status(400).json({ success: false, error: 'Target username is required' });
      }

      const user = await getUserByUsername(targetUsername);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const gameState = await loadGameState(targetUsername);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            username: user.username,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
          gameState: gameState?.gameState || null,
        },
      });
    } else if (req.method === 'PUT') {
      // Update user
      const { targetUsername, isAdmin: newIsAdmin, gameState } = req.body;

      if (!targetUsername) {
        return res.status(400).json({ success: false, error: 'Target username is required' });
      }

      if (typeof newIsAdmin === 'boolean') {
        await updateUserAdminStatus(targetUsername, newIsAdmin);
      }

      if (gameState) {
        await updateUserGameState(targetUsername, gameState);
      }

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
      });
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in admin user endpoint:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

