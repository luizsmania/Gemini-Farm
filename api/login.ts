import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserByUsername, updateUserLastLogin, hashPassword, initDatabase } from './database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize database on first request
    await initDatabase();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Username not found. Please check your username or create an account.' });
    }

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    // Update last login time
    await updateUserLastLogin(username);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          username: user.username,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

