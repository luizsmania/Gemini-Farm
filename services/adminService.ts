import { User, GameState } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AdminUserInfo {
  username: string;
  isAdmin: boolean;
  createdAt: number;
  lastLoginAt?: number;
  gameState?: GameState | null;
}

// Get all users (admin only)
export const getAllUsers = async (adminUsername: string): Promise<AdminUserInfo[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users?username=${encodeURIComponent(adminUsername)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get users');
    }

    const result: ApiResponse<AdminUserInfo[]> = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

// Get specific user info (admin only)
export const getUserInfo = async (adminUsername: string, targetUsername: string): Promise<AdminUserInfo | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/user?adminUsername=${encodeURIComponent(adminUsername)}&targetUsername=${encodeURIComponent(targetUsername)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const result: ApiResponse<{ user: AdminUserInfo; gameState: GameState | null }> = await response.json();
    if (result.success && result.data) {
      return {
        ...result.data.user,
        gameState: result.data.gameState,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Update user (admin only)
export const updateUser = async (
  adminUsername: string,
  targetUsername: string,
  updates: { isAdmin?: boolean; gameState?: GameState }
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/user?adminUsername=${encodeURIComponent(adminUsername)}&targetUsername=${encodeURIComponent(targetUsername)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUsername,
        ...updates,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    const result: ApiResponse<void> = await response.json();
    return result.success || false;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
};

