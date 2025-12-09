
import { User } from "../types";

const USERS_KEY = 'gemini_farm_users';
const SESSION_KEY = 'gemini_farm_session';

interface StoredUser {
  username: string;
  passwordHash: string; // Simple mock hash
  createdAt: number;
}

// Simple mock hashing (Not secure for real production, but fine for local-only demo)
const hashPassword = (password: string) => {
  return btoa(password + "_salt_gemini");
};

export const registerUser = (username: string, password: string): { success: boolean; message: string; user?: User } => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};

  if (users[username]) {
    return { success: false, message: "Username already exists." };
  }

  if (username.length < 3) return { success: false, message: "Username too short." };
  if (password.length < 4) return { success: false, message: "Password too short." };

  const newUser: StoredUser = {
    username,
    passwordHash: hashPassword(password),
    createdAt: Date.now()
  };

  users[username] = newUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  return { success: true, message: "Account created!", user: { username, createdAt: newUser.createdAt } };
};

export const loginUser = (username: string, password: string): { success: boolean; message: string; user?: User } => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};

  const user = users[username];

  if (!user || user.passwordHash !== hashPassword(password)) {
    return { success: false, message: "Invalid username or password." };
  }

  // Set Session
  localStorage.setItem(SESSION_KEY, username);

  return { success: true, message: "Welcome back!", user: { username, createdAt: user.createdAt } };
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const checkSession = (): User | null => {
  const username = localStorage.getItem(SESSION_KEY);
  if (!username) return null;

  const usersStr = localStorage.getItem(USERS_KEY);
  const users: Record<string, StoredUser> = usersStr ? JSON.parse(usersStr) : {};
  
  const user = users[username];
  if (user) {
    return { username: user.username, createdAt: user.createdAt };
  }
  return null;
};
