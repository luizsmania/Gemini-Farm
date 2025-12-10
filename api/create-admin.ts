import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUser, hashPassword, initDatabase, usernameExists } from './database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await initDatabase();

    const { username, password } = req.body;
    const adminUsername = username || 'luizao';
    const adminPassword = password || 'luizao';

    // Check if admin already exists
    const exists = await usernameExists(adminUsername);
    if (exists) {
      // Update existing user to admin
      const { updateUserAdminStatus } = await import('./database.js');
      await updateUserAdminStatus(adminUsername, true);
      return res.status(200).json({
        success: true,
        message: `User "${adminUsername}" is now an admin`,
      });
    }

    // Create admin user
    const passwordHash = hashPassword(adminPassword);
    await createUser(adminUsername, passwordHash, true);

    return res.status(200).json({
      success: true,
      message: `Admin user "${adminUsername}" created successfully`,
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

