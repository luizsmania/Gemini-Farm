import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Database {
  users: Record<string, any>;
  gameStates: Record<string, any>;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const db = readDB();
    const gameState = db.gameStates[username.toLowerCase()];

    if (!gameState) {
      return res.status(200).json({ success: false, error: 'No save data found' });
    }

    // Remove internal fields
    const { lastSaved, ...cleanGameState } = gameState;

    return res.status(200).json({ success: true, data: cleanGameState });
  } catch (error) {
    console.error('Error loading game state:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

