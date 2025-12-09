import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

interface Database {
  users: Record<string, any>;
  gameStates: Record<string, any>;
}

interface StoredUser {
  username: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt?: number;
}

// In-memory database (for serverless functions)
// NOTE: In production, replace this with a real database
let db: Database = { users: {}, gameStates: {} };

// For local development, try to read from file
if (typeof process !== 'undefined' && process.env.VERCEL !== '1') {
  try {
    const fs = require('fs');
    const path = require('path');
    const DB_PATH = path.join(process.cwd(), 'api', 'db.json');
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading database file:', error);
  }
}

function readDB(): Database {
  return db;
}

function writeDB(newDb: Database): void {
  db = newDb;
  // Try to write to file in local development
  if (typeof process !== 'undefined' && process.env.VERCEL !== '1') {
    try {
      const fs = require('fs');
      const path = require('path');
      const DB_PATH = path.join(process.cwd(), 'api', 'db.json');
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (error) {
      // Ignore file write errors in serverless
    }
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_salt_gemini').digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const db = readDB();
    const normalizedUsername = username.trim().toLowerCase();
    const user: StoredUser = db.users[normalizedUsername];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Username not found. Please check your username or create an account.' });
    }

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    // Update last login time
    user.lastLoginAt = Date.now();
    db.users[normalizedUsername] = user;
    writeDB(db);

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

