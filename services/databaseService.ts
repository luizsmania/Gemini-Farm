import { GameState, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Save game state for a user
export const saveGameState = async (username: string, gameState: GameState): Promise<{ success: boolean; metadata?: { lastSaved: number; updatedAt: number; version: number } }> => {
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
    if (result.success) {
      // After saving, get the updated metadata
      const loadResult = await loadGameState(username);
      return { 
        success: true,
        metadata: loadResult?.metadata
      };
    }
    return { success: false };
  } catch (error) {
    console.error('Error saving game state:', error);
    // Fallback to localStorage if API fails
    try {
      const saveKey = `gemini_farm_save_${username}`;
      localStorage.setItem(saveKey, JSON.stringify(gameState));
      return { success: true };
    } catch (e) {
      console.error('Failed to save to localStorage fallback:', e);
      return { success: false };
    }
  }
};

// Load game state for a user
export const loadGameState = async (username: string): Promise<{ gameState: GameState; metadata?: { lastSaved: number; updatedAt: number; version: number } } | null> => {
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

    const result: ApiResponse<GameState & { metadata?: { lastSaved: number; updatedAt: number; version: number } }> = await response.json();
    if (result.success && result.data) {
      const data = result.data as any;
      const { metadata, ...gameState } = data;
      return { 
        gameState: gameState as GameState,
        metadata: metadata || (result as any).metadata
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading game state:', error);
    // Fallback to localStorage if API fails
    try {
      const saveKey = `gemini_farm_save_${username}`;
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        return { gameState: JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load from localStorage fallback:', e);
    }
    return null;
  }
};

// Check for updates on the server
export const checkForUpdates = async (
  username: string, 
  lastKnownVersion?: number, 
  lastKnownUpdatedAt?: number
): Promise<{ hasUpdates: boolean; serverVersion?: number; serverUpdatedAt?: number; lastSaved?: number }> => {
  try {
    const params = new URLSearchParams({ username });
    if (lastKnownVersion !== undefined) {
      params.append('lastKnownVersion', lastKnownVersion.toString());
    }
    if (lastKnownUpdatedAt !== undefined) {
      params.append('lastKnownUpdatedAt', lastKnownUpdatedAt.toString());
    }

    const response = await fetch(`${API_BASE_URL}/check-updates?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check for updates');
    }

    const result: ApiResponse<{ 
      hasUpdates: boolean; 
      serverVersion?: number; 
      serverUpdatedAt?: number; 
      lastSaved?: number;
      clientVersion?: number;
      clientUpdatedAt?: number;
    }> = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    return { hasUpdates: false };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { hasUpdates: false };
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

    const result: ApiResponse<{ user: User }> = await response.json();
    
    // Always parse the result, even if response is not ok
    if (result.success && result.data) {
      return {
        success: true,
        message: 'Account created successfully! Welcome to Gemini Farm!',
        user: result.data.user,
      };
    }
    
    // Return the error message from the API
    return { 
      success: false, 
      message: result.error || 'Registration failed. Please try again.' 
    };
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

