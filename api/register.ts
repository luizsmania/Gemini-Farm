import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUser, usernameExists, hashPassword, initDatabase } from './database.js';

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

    // Check if username exists (first check to provide immediate feedback)
    let exists: boolean;
    try {
      exists = await usernameExists(username);
    } catch (checkError) {
      console.error('Error checking username existence:', checkError);
      // If check fails, we'll still try to create and let the database constraint handle it
      exists = false;
    }
    
    if (exists) {
      console.log(`Registration blocked: Username "${username}" already exists`);
      return res.status(400).json({ success: false, error: 'Username already exists. Please choose another.' });
    }

    // Create user (this will also check for race conditions)
    const passwordHash = hashPassword(password);
    let newUser: any;
    try {
      console.log(`Attempting to create user: "${username}"`);
      newUser = await createUser(username, passwordHash);
      console.log(`User created successfully: "${username}"`);
    } catch (createError: any) {
      console.error(`Error creating user "${username}":`, createError);
      // Handle username already exists (race condition - someone registered between check and create)
      if (createError?.message === 'USERNAME_EXISTS' || createError?.code === '23505') {
        console.log(`Registration blocked: Username "${username}" already exists (race condition)`);
        return res.status(400).json({ success: false, error: 'Username already exists. Please choose another.' });
      }
      throw createError; // Re-throw other errors
    }

    // Verify the user was actually created (double-check)
    try {
      const verifyUser = await usernameExists(username);
      if (!verifyUser) {
        console.error(`Verification failed: User "${username}" was not found after creation`);
        return res.status(500).json({ success: false, error: 'Failed to create account. Please try again.' });
      }
      console.log(`User verification successful: "${username}"`);
    } catch (verifyError) {
      console.error(`Error verifying user "${username}":`, verifyError);
      // If verification fails but user was created, still return success
      // The database constraint ensures uniqueness
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          username: newUser.username,
          createdAt: newUser.createdAt,
          isAdmin: newUser.isAdmin,
        },
      },
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    // Handle unique constraint violation (final safety net)
    if (error?.code === '23505' || error?.message === 'USERNAME_EXISTS' || error?.message?.includes('unique')) {
      return res.status(400).json({ success: false, error: 'Username already exists. Please choose another.' });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

