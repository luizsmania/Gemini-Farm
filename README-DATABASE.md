# Database Setup Guide

This project uses **PostgreSQL** via Vercel Postgres to store user information and game progress.

## Setup Instructions

### 1. Install Dependencies

The required package `@vercel/postgres` is already included in `package.json`. Install it by running:

```bash
npm install
```

### 2. Set Up Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database** and select **Postgres**
4. Follow the setup wizard to create your database
5. Vercel will automatically add the required environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

### 3. Database Schema

The database schema is automatically created on first API request. The schema includes:

- **users table**: Stores user accounts (username, password hash, timestamps)
- **game_states table**: Stores game progress as JSONB (coins, inventory, plots, etc.)

### 4. Features

- **Automatic Schema Creation**: Tables are created automatically on first API call
- **Update Detection**: The app checks for server-side updates when players open the website
- **Version Tracking**: Each game state save increments a version number for conflict detection
- **Password Security**: Passwords are hashed using SHA-256 with a salt

### 5. API Endpoints

All API endpoints have been updated to use PostgreSQL:

- `/api/register` - Create new user account
- `/api/login` - Authenticate user
- `/api/check-username` - Check if username exists
- `/api/save` - Save game state
- `/api/load` - Load game state
- `/api/check-updates` - Check if server has newer game state

### 6. Update Detection

When a player opens the website:

1. The app checks stored metadata (version, updatedAt) from localStorage
2. Sends a request to `/api/check-updates` with the client's last known version
3. If updates are available, automatically loads the latest game state from the server
4. Shows a notification to the user that their game has been updated

### 7. Local Development

For local development, you can:

1. Use Vercel CLI to link your local environment to your Vercel project:
   ```bash
   vercel link
   vercel env pull
   ```

2. Or manually set the PostgreSQL connection string in a `.env.local` file:
   ```
   POSTGRES_URL=your_postgres_connection_string
   ```

The database will work seamlessly in both local development and production environments.

### 8. Migration from Old System

The app automatically migrates data from localStorage to the database when:
- A user logs in and has localStorage data but no database entry
- The migration happens transparently without user intervention
