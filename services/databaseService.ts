import { GameState, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Save game state for a user
export const saveGameState = async (username: string, gameState: GameState): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        gameState,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save game state');
    }

    const result: ApiResponse<void> = await response.json();
    return result.success || false;
  } catch (error) {
    console.error('Error saving game state:', error);
    // Fallback to localStorage if API fails
    try {
      const saveKey = `gemini_farm_save_${username}`;
      localStorage.setItem(saveKey, JSON.stringify(gameState));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage fallback:', e);
      return false;
    }
  }
};

// Load game state for a user
export const loadGameState = async (username: string): Promise<GameState | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/load?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load game state');
    }

    const result: ApiResponse<GameState> = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('Error loading game state:', error);
    // Fallback to localStorage if API fails
    try {
      const saveKey = `gemini_farm_save_${username}`;
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load from localStorage fallback:', e);
    }
    return null;
  }
};

// Register a new user
export const registerUserAPI = async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register user');
    }

    const result: ApiResponse<{ user: User }> = await response.json();
    if (result.success && result.data) {
      return {
        success: true,
        message: 'Account created successfully! Welcome to Gemini Farm!',
        user: result.data.user,
      };
    }
    return { success: false, message: result.error || 'Registration failed' };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, message: 'Failed to connect to server. Please try again.' };
  }
};

// Login a user
export const loginUserAPI = async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to login');
    }

    const result: ApiResponse<{ user: User }> = await response.json();
    if (result.success && result.data) {
      return {
        success: true,
        message: `Welcome back, ${result.data.user.username}!`,
        user: result.data.user,
      };
    }
    return { success: false, message: result.error || 'Login failed' };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, message: 'Failed to connect to server. Please try again.' };
  }
};

// Check if username exists
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/check-username?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const result: ApiResponse<{ exists: boolean }> = await response.json();
    return result.data?.exists || false;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

