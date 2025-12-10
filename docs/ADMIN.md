# 👨‍💼 Admin Panel Guide

## Creating an Admin User

### Method 1: Using the API Endpoint

1. **Deploy the API endpoint** (if not already deployed)
   - The endpoint is at `/api/create-admin`

2. **Make a POST request**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/create-admin \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

3. **Or use a tool like Postman**:
   - Method: POST
   - URL: `https://your-app.vercel.app/api/create-admin`
   - Body (JSON):
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```

### Method 2: Direct Database Access

If you have direct database access, you can manually set the `isAdmin` flag:

```sql
UPDATE users SET "isAdmin" = true WHERE username = 'your-username';
```

## Using the Admin Panel

1. **Login** with your admin account
2. **Access Admin Panel** - Click the admin icon in the top right
3. **Features Available**:
   - View all users
   - Edit user data (coins, inventory, plots, etc.)
   - Modify admin status
   - View user statistics

## Security Notes

- ⚠️ **Never commit admin credentials to Git**
- ⚠️ **Use strong passwords for admin accounts**
- ⚠️ **Limit admin access to trusted users only**
- ⚠️ **The create-admin endpoint should be disabled in production after creating the first admin**

---

**Note**: The admin panel is only accessible to users with `isAdmin: true` in the database.


