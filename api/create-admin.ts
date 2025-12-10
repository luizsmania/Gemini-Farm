import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUser, hashPassword, initDatabase, usernameExists, updateUserAdminStatus } from './database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow both GET and POST for easier access
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await initDatabase();

    const { username, password } = req.method === 'POST' ? req.body : req.query;
    const adminUsername = (username || 'luizao') as string;
    const adminPassword = (password || 'luizao') as string;

    // Check if admin already exists
    const exists = await usernameExists(adminUsername);
    if (exists) {
      // Update existing user to admin
      await updateUserAdminStatus(adminUsername, true);
      return res.status(200).json({
        success: true,
        message: `User "${adminUsername}" is now an admin`,
        username: adminUsername,
      });
    }

    // Create admin user
    const passwordHash = hashPassword(adminPassword);
    await createUser(adminUsername, passwordHash, true);

    return res.status(200).json({
      success: true,
      message: `Admin user "${adminUsername}" created successfully`,
      username: adminUsername,
      password: adminPassword,
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

