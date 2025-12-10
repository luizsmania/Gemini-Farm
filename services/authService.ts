
import { User } from "../types";
import { registerUserAPI, loginUserAPI } from "./databaseService";

const SESSION_KEY = 'gemini_farm_session';

// Use database API for registration - NO localStorage fallback to ensure uniqueness
export const registerUser = async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const result = await registerUserAPI(username, password);
    
    if (result.success && result.user) {
      // Set session
      localStorage.setItem(SESSION_KEY, result.user.username);
      return result;
    }
    
    // Do NOT fallback to localStorage - all accounts must be in database for uniqueness
    // If API fails, return error
    return result;
  } catch (error) {
    // Do NOT fallback to localStorage - all accounts must be in database
    console.error('Registration error:', error);
    return { 
      success: false, 
      message: 'Failed to create account. Please check your connection and try again.' 
    };
  }
};

// Legacy localStorage fallback (for backward compatibility)
const USERS_KEY = 'gemini_farm_users';

interface StoredUser {
  username: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt?: number;
}

const hashPassword = (password: string) => {
  return btoa(password + "_salt_gemini");
};

export const registerUserLocal = (username: string, password: string): { success: boolean; message: string; user?: User } => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};

  // Username validation
  if (username.trim().length < 3) {
    return { success: false, message: "Username must be at least 3 characters long." };
  }
  if (username.trim().length > 20) {
    return { success: false, message: "Username must be less than 20 characters." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return { success: false, message: "Username can only contain letters, numbers, and underscores." };
  }

  if (users[username.trim().toLowerCase()]) {
    return { success: false, message: "Username already exists. Please choose another." };
  }

  // Password validation
  if (password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters long." };
  }
  if (password.length > 100) {
    return { success: false, message: "Password is too long." };
  }

  const normalizedUsername = username.trim();
  const newUser: StoredUser = {
    username: normalizedUsername,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  };

  users[normalizedUsername.toLowerCase()] = newUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Set session immediately after registration
  localStorage.setItem(SESSION_KEY, normalizedUsername);

  return { 
    success: true, 
    message: "Account created successfully! Welcome to Gemini Farm!", 
    user: { username: normalizedUsername, createdAt: newUser.createdAt } 
  };
};

// Use database API for login, fallback to localStorage
export const loginUser = async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const result = await loginUserAPI(username, password);
    
    if (result.success && result.user) {
      // Set session
      localStorage.setItem(SESSION_KEY, result.user.username);
      return result;
    }
    
    // If API fails, fallback to localStorage
    if (!result.success && result.message.includes('Failed to connect')) {
      return loginUserLocal(username, password);
    }
    
    return result;
  } catch (error) {
    // Fallback to localStorage on error
    return loginUserLocal(username, password);
  }
};

// Legacy localStorage fallback
export const loginUserLocal = (username: string, password: string): { success: boolean; message: string; user?: User } => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};

  const normalizedUsername = username.trim().toLowerCase();
  const user = users[normalizedUsername];

  if (!user) {
    return { success: false, message: "Username not found. Please check your username or create an account." };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, message: "Incorrect password. Please try again." };
  }

  // Update last login time
  user.lastLoginAt = Date.now();
  users[normalizedUsername] = user;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Set Session
  localStorage.setItem(SESSION_KEY, user.username);

  return { 
    success: true, 
    message: `Welcome back, ${user.username}!`, 
    user: { username: user.username, createdAt: user.createdAt } 
  };
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const checkSession = (): User | null => {
  const username = localStorage.getItem(SESSION_KEY);
  if (!username) return null;

  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};
  
  const user = users[username.toLowerCase()];
  if (user) {
    return { username: user.username, createdAt: user.createdAt };
  }
  return null;
};

export const getUserInfo = (username: string): { lastLoginAt?: number; createdAt: number } | null => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};
  
  const user = users[username.toLowerCase()];
  if (user) {
    return { lastLoginAt: user.lastLoginAt, createdAt: user.createdAt };
  }
  return null;
};
