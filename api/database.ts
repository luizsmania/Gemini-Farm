import { sql } from '@vercel/postgres';

// Database schema initialization
export async function initDatabase() {
  try {
    // Create players table (nickname only, no auth)
    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create matches table
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_red UUID REFERENCES players(id) ON DELETE SET NULL,
        player_black UUID REFERENCES players(id) ON DELETE SET NULL,
        winner UUID REFERENCES players(id) ON DELETE SET NULL,
        finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create moves table
    await sql`
      CREATE TABLE IF NOT EXISTS moves (
        id SERIAL PRIMARY KEY,
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        move_number INT NOT NULL,
        from_pos INT NOT NULL,
        to_pos INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_players_nickname ON players(nickname)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_matches_player_red ON matches(player_red)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_matches_player_black ON matches(player_black)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_matches_finished_at ON matches(finished_at)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_moves_match_id ON moves(match_id)
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Checkers game database operations

export interface Player {
  id: string;
  nickname: string;
  createdAt: Date;
}

export interface Match {
  id: string;
  playerRed: string | null;
  playerBlack: string | null;
  winner: string | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export interface Move {
  id: number;
  matchId: string;
  moveNumber: number;
  fromPos: number;
  toPos: number;
  createdAt: Date;
}

export async function createPlayer(nickname: string): Promise<Player> {
  try {
    const result = await sql`
      INSERT INTO players (nickname)
      VALUES (${nickname})
      RETURNING id, nickname, created_at
    `;

    const row = result.rows[0];
    return {
      id: row.id,
      nickname: row.nickname,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

export async function getPlayerById(id: string): Promise<Player | null> {
  try {
    const result = await sql`
      SELECT id, nickname, created_at
      FROM players
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      nickname: row.nickname,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error getting player:', error);
    throw error;
  }
}

export async function createMatch(playerRed: string, playerBlack: string): Promise<Match> {
  try {
    const result = await sql`
      INSERT INTO matches (player_red, player_black)
      VALUES (${playerRed}, ${playerBlack})
      RETURNING id, player_red, player_black, winner, finished_at, created_at
    `;

    const row = result.rows[0];
    return {
      id: row.id,
      playerRed: row.player_red,
      playerBlack: row.player_black,
      winner: row.winner,
      finishedAt: row.finished_at,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
}

export async function finishMatch(matchId: string, winnerId: string): Promise<void> {
  try {
    await sql`
      UPDATE matches
      SET winner = ${winnerId}, finished_at = NOW()
      WHERE id = ${matchId}
    `;
  } catch (error) {
    console.error('Error finishing match:', error);
    throw error;
  }
}

export async function addMove(matchId: string, moveNumber: number, fromPos: number, toPos: number): Promise<Move> {
  try {
    const result = await sql`
      INSERT INTO moves (match_id, move_number, from_pos, to_pos)
      VALUES (${matchId}, ${moveNumber}, ${fromPos}, ${toPos})
      RETURNING id, match_id, move_number, from_pos, to_pos, created_at
    `;

    const row = result.rows[0];
    return {
      id: row.id,
      matchId: row.match_id,
      moveNumber: row.move_number,
      fromPos: row.from_pos,
      toPos: row.to_pos,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error adding move:', error);
    throw error;
  }
}

export async function getMatchHistory(playerId: string): Promise<Array<{
  id: string;
  opponentNickname: string;
  opponentColor: 'red' | 'black';
  yourColor: 'red' | 'black';
  winner: string | null;
  finishedAt: Date | null;
}>> {
  try {
    console.log('[getMatchHistory] Querying for playerId:', playerId);
    
    const result = await sql`
      SELECT 
        m.id,
        COALESCE(
          CASE 
            WHEN m.player_red = ${playerId} THEN p2.nickname
            ELSE p1.nickname
          END,
          'Unknown Player'
        ) as opponent_nickname,
        CASE 
          WHEN m.player_red = ${playerId} THEN 'black'
          ELSE 'red'
        END as opponent_color,
        CASE 
          WHEN m.player_red = ${playerId} THEN 'red'
          ELSE 'black'
        END as your_color,
        m.winner,
        m.finished_at
      FROM matches m
      LEFT JOIN players p1 ON m.player_red = p1.id
      LEFT JOIN players p2 ON m.player_black = p2.id
      WHERE (m.player_red = ${playerId} OR m.player_black = ${playerId})
        AND m.finished_at IS NOT NULL
      ORDER BY m.finished_at DESC
      LIMIT 50
    `;

    console.log('[getMatchHistory] Query returned', result.rows.length, 'rows');

    return result.rows.map(row => ({
      id: row.id,
      opponentNickname: row.opponent_nickname || 'Unknown Player',
      opponentColor: row.opponent_color as 'red' | 'black',
      yourColor: row.your_color as 'red' | 'black',
      winner: row.winner,
      finishedAt: row.finished_at,
    }));
  } catch (error: any) {
    console.error('[getMatchHistory] Error getting match history:', error);
    console.error('[getMatchHistory] Error message:', error.message);
    console.error('[getMatchHistory] Error code:', error.code);
    throw error;
  }
}

