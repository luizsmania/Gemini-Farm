# Account Security & Uniqueness

This document explains how account uniqueness is enforced across all devices.

## Account Uniqueness Enforcement

### Database-Level Protection

1. **Unique Constraints**: The database has UNIQUE constraints on both:
   - `username` (case-sensitive)
   - `username_lower` (case-insensitive)
   
   This ensures that:
   - "JohnDoe" and "johndoe" are treated as the same username
   - No duplicate usernames can exist in the database
   - The database will reject any attempt to create a duplicate

2. **Race Condition Protection**: 
   - The registration process checks for username existence before creating
   - Uses `ON CONFLICT DO NOTHING` with `RETURNING` to detect if insert succeeded
   - Verifies the user was actually created after insertion
   - Handles PostgreSQL unique constraint violations (error code 23505)

### Registration Flow

1. **Client-side validation**: Username format and length checked
2. **Server-side check**: Database queried to see if username exists
3. **Insert attempt**: User creation attempted with conflict handling
4. **Verification**: Final check to confirm user was created
5. **Error handling**: Multiple layers catch duplicate username attempts

### Cross-Device Access

- **Single Source of Truth**: All accounts are stored in PostgreSQL database
- **No localStorage Fallback**: Registration no longer falls back to localStorage, ensuring all accounts go through the database
- **Universal Access**: Once an account is created, it can be accessed from any device by logging in with the same username and password
- **Synchronized Data**: Game progress is stored in the database and synced across devices

### Security Features

1. **Password Hashing**: Passwords are hashed using SHA-256 with a salt before storage
2. **Case-Insensitive Usernames**: Usernames are normalized to lowercase for comparison
3. **Database Constraints**: PostgreSQL enforces uniqueness at the database level
4. **No Duplicate Accounts**: Impossible to create the same account on different devices

### Error Messages

When attempting to register a username that already exists:
- "Username already exists. Please choose another."

This message appears in these scenarios:
- Username exists in database (initial check)
- Race condition detected (two users try to register same username simultaneously)
- Database constraint violation caught

### Testing Uniqueness

To verify account uniqueness works:
1. Register an account on Device A
2. Try to register the same username on Device B
3. Device B should receive "Username already exists" error
4. Device B can then log in with the account created on Device A

