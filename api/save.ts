import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Database {
  users: Record<string, any>;
  gameStates: Record<string, any>;
}

// In-memory database (for serverless functions)
// NOTE: In production, replace this with a real database (PostgreSQL, MongoDB, Vercel KV, etc.)
// This in-memory store will reset on each deployment
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, gameState } = req.body;

    if (!username || !gameState) {
      return res.status(400).json({ success: false, error: 'Username and gameState are required' });
    }

    const db = readDB();
    db.gameStates[username.toLowerCase()] = {
      ...gameState,
      lastSaved: Date.now(),
    };
    writeDB(db);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving game state:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

