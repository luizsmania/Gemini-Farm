import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUser, usernameExists, hashPassword, initDatabase } from './db';

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

    // Validation
    if (username.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters long.' });
    }
    if (username.trim().length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be less than 20 characters.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Check if username exists
    const exists = await usernameExists(username);
    if (exists) {
      return res.status(400).json({ success: false, error: 'Username already exists. Please choose another.' });
    }

    // Create user
    const passwordHash = hashPassword(password);
    const newUser = await createUser(username, passwordHash);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          username: newUser.username,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    // Handle unique constraint violation
    if (error?.code === '23505' || error?.message?.includes('unique')) {
      return res.status(400).json({ success: false, error: 'Username already exists. Please choose another.' });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

