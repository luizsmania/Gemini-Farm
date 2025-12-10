import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// Database schema initialization
export async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        username_lower VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at BIGINT NOT NULL,
        last_login_at BIGINT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
      )
    `;
    
    // Add is_admin column if it doesn't exist (for existing databases)
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
    `;

    // Create game_states table
    await sql`
      CREATE TABLE IF NOT EXISTS game_states (
        id SERIAL PRIMARY KEY,
        username_lower VARCHAR(50) UNIQUE NOT NULL REFERENCES users(username_lower) ON DELETE CASCADE,
        game_state JSONB NOT NULL,
        last_saved BIGINT NOT NULL,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        version INTEGER NOT NULL DEFAULT 1
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(username_lower)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_game_states_username_lower ON game_states(username_lower)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_game_states_updated_at ON game_states(updated_at)
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User operations
export interface StoredUser {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

export async function createUser(username: string, passwordHash: string, isAdmin: boolean = false): Promise<StoredUser> {
  const now = Date.now();
  const usernameLower = username.trim().toLowerCase();
  
  try {
    // Use INSERT with ON CONFLICT to handle race conditions
    // Return the inserted row to verify it was actually created
    const result = await sql`
      INSERT INTO users (username, username_lower, password_hash, is_admin, created_at, last_login_at)
      VALUES (${username.trim()}, ${usernameLower}, ${passwordHash}, ${isAdmin}, ${now}, ${now})
      ON CONFLICT (username_lower) DO NOTHING
      RETURNING username, password_hash, is_admin, created_at, last_login_at
    `;

    // If no row was returned, the username already exists (race condition or duplicate)
    if (result.rows.length === 0) {
      throw new Error('USERNAME_EXISTS');
    }

    const row = result.rows[0];
    return {
      username: row.username,
      passwordHash: row.password_hash,
      isAdmin: row.is_admin || false,
      createdAt: parseInt(row.created_at),
      lastLoginAt: row.last_login_at ? parseInt(row.last_login_at) : now,
    };
  } catch (error: any) {
    // Re-throw our custom error
    if (error.message === 'USERNAME_EXISTS') {
      throw error;
    }
    // Check for PostgreSQL unique constraint violation
    if (error?.code === '23505') {
      throw new Error('USERNAME_EXISTS');
    }
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string): Promise<StoredUser | null> {
  const usernameLower = username.trim().toLowerCase();
  
  try {
    const result = await sql`
      SELECT username, password_hash, is_admin, created_at, last_login_at
      FROM users
      WHERE username_lower = ${usernameLower}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      username: row.username,
      passwordHash: row.password_hash,
      isAdmin: row.is_admin || false,
      createdAt: parseInt(row.created_at),
      lastLoginAt: row.last_login_at ? parseInt(row.last_login_at) : undefined,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function updateUserLastLogin(username: string): Promise<void> {
  const usernameLower = username.trim().toLowerCase();
  const now = Date.now();
  
  try {
    await sql`
      UPDATE users
      SET last_login_at = ${now}, updated_at = ${now}
      WHERE username_lower = ${usernameLower}
    `;
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}

export async function usernameExists(username: string): Promise<boolean> {
  const usernameLower = username.trim().toLowerCase();
  
  try {
    const result = await sql`
      SELECT 1 FROM users WHERE username_lower = ${usernameLower} LIMIT 1
    `;
    const exists = result.rows.length > 0;
    console.log(`Username check: "${username}" (normalized: "${usernameLower}") exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error('Error checking username:', error);
    // On error, return false but log it - this might indicate database connection issues
    throw error; // Re-throw to let caller handle it
  }
}

// Game state operations
export async function saveGameState(username: string, gameState: any): Promise<void> {
  const usernameLower = username.trim().toLowerCase();
  const now = Date.now();
  
  try {
    await sql`
      INSERT INTO game_states (username_lower, game_state, last_saved, updated_at, version)
      VALUES (${usernameLower}, ${JSON.stringify(gameState)}::jsonb, ${now}, ${now}, 1)
      ON CONFLICT (username_lower) 
      DO UPDATE SET 
        game_state = ${JSON.stringify(gameState)}::jsonb,
        last_saved = ${now},
        updated_at = ${now},
        version = game_states.version + 1
    `;
  } catch (error) {
    console.error('Error saving game state:', error);
    throw error;
  }
}

export async function loadGameState(username: string): Promise<any | null> {
  const usernameLower = username.trim().toLowerCase();
  
  try {
    const result = await sql`
      SELECT game_state, last_saved, updated_at, version
      FROM game_states
      WHERE username_lower = ${usernameLower}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      gameState: row.game_state,
      lastSaved: parseInt(row.last_saved),
      updatedAt: parseInt(row.updated_at),
      version: parseInt(row.version),
    };
  } catch (error) {
    console.error('Error loading game state:', error);
    throw error;
  }
}

export async function getGameStateMetadata(username: string): Promise<{ lastSaved: number; updatedAt: number; version: number } | null> {
  const usernameLower = username.trim().toLowerCase();
  
  try {
    const result = await sql`
      SELECT last_saved, updated_at, version
      FROM game_states
      WHERE username_lower = ${usernameLower}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      lastSaved: parseInt(row.last_saved),
      updatedAt: parseInt(row.updated_at),
      version: parseInt(row.version),
    };
  } catch (error) {
    console.error('Error getting game state metadata:', error);
    return null;
  }
}

// Admin operations
export async function getAllUsers(): Promise<Array<{ username: string; isAdmin: boolean; createdAt: number; lastLoginAt?: number }>> {
  try {
    const result = await sql`
      SELECT username, is_admin, created_at, last_login_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      username: row.username,
      isAdmin: row.is_admin || false,
      createdAt: parseInt(row.created_at),
      lastLoginAt: row.last_login_at ? parseInt(row.last_login_at) : undefined,
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

export async function updateUserAdminStatus(username: string, isAdmin: boolean): Promise<void> {
  const usernameLower = username.trim().toLowerCase();
  const now = Date.now();
  
  try {
    await sql`
      UPDATE users
      SET is_admin = ${isAdmin}, updated_at = ${now}
      WHERE username_lower = ${usernameLower}
    `;
  } catch (error) {
    console.error('Error updating user admin status:', error);
    throw error;
  }
}

export async function updateUserGameState(username: string, gameState: any): Promise<void> {
  await saveGameState(username, gameState);
}

// Password hashing
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_salt_gemini').digest('hex');
}

