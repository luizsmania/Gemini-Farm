import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initDatabase, usernameExists } from './database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize database
    await initDatabase();

    // Test database connection
    const connectionTest = await sql`SELECT 1 as test`;
    
    // Get all users
    const allUsers = await sql`
      SELECT username, username_lower, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    // Test username check
    const { username } = req.query;
    let usernameCheckResult = null;
    if (username && typeof username === 'string') {
      usernameCheckResult = await usernameExists(username);
    }

    return res.status(200).json({
      success: true,
      data: {
        databaseConnected: connectionTest.rows.length > 0,
        totalUsers: allUsers.rows.length,
        users: allUsers.rows,
        usernameCheck: username ? {
          username,
          exists: usernameCheckResult
        } : null,
        environment: {
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
        }
      }
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Database connection failed',
      details: {
        code: error.code,
        environment: {
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
        }
      }
    });
  }
}

