# Database Setup for Gemini Farm

The game now uses a database to store user accounts and game progress. Each user has their own isolated farm and progress saved to the database.

## Architecture

- **Frontend**: React app that calls API endpoints
- **Backend**: Vercel serverless functions in `/api` directory
- **Database**: JSON file-based storage (`api/db.json`) - can be easily migrated to a real database

## API Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - Login a user
- `GET /api/check-username` - Check if username exists
- `POST /api/save` - Save game state for a user
- `GET /api/load` - Load game state for a user

## Database Structure

The database (`api/db.json`) stores:
- `users`: User accounts with hashed passwords
- `gameStates`: Game progress for each user (keyed by username)

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically detect and deploy:
   - The React app (frontend)
   - The API functions in `/api` (backend)
4. The database file will be created automatically on first use

## Migrating to a Real Database

To migrate from JSON file to a real database (PostgreSQL, MongoDB, etc.):

1. Update each API file in `/api` to use your database client
2. Replace the `readDB()` and `writeDB()` functions with database queries
3. The frontend code doesn't need to change - it already uses the API service layer

## Local Development

For local development, the API will use the JSON file in `api/db.json`. Make sure this file exists and is writable.

## Security Notes

- Passwords are hashed using SHA-256 (consider upgrading to bcrypt for production)
- Each user's game state is isolated by username
- API endpoints validate input before processing

## Environment Variables

You can set `VITE_API_URL` in your `.env` file to point to a custom API endpoint (defaults to `/api` for same-origin requests).

