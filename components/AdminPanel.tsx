import React, { useState, useEffect } from 'react';
import { X, Users, Edit, Save, Shield, Coins, Package } from 'lucide-react';
import { Button } from './Button';
import { AdminUserInfo, getAllUsers, getUserInfo, updateUser } from '../services/adminService';
import { GameState } from '../types';

interface AdminPanelProps {
  currentUsername: string;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUsername, onClose }) => {
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedGameState, setEditedGameState] = useState<GameState | null>(null);
  const [editedIsAdmin, setEditedIsAdmin] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers(currentUsername);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (username: string) => {
    setLoading(true);
    try {
      const userInfo = await getUserInfo(currentUsername, username);
      if (userInfo) {
        setSelectedUser(userInfo);
        setEditedGameState(userInfo.gameState || null);
        setEditedIsAdmin(userInfo.isAdmin);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const success = await updateUser(currentUsername, selectedUser.username, {
        isAdmin: editedIsAdmin,
        gameState: editedGameState || undefined,
      });

      if (success) {
        setEditing(false);
        await loadUsers();
        await handleUserClick(selectedUser.username);
      }
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Users List */}
          <div className="w-1/3 border-r border-slate-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-white">All Users ({users.length})</h3>
              </div>
              {loading && !selectedUser ? (
                <div className="text-slate-400 text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.username}
                      onClick={() => handleUserClick(user.username)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedUser?.username === user.username
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{user.username}</span>
                        {user.isAdmin && (
                          <Shield className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        Created: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedUser ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    User: {selectedUser.username}
                  </h3>
                  {!editing ? (
                    <Button onClick={() => setEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <Button onClick={handleSave} disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  )}
                </div>

                {/* User Info */}
                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Admin Status:</span>
                      {editing ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editedIsAdmin}
                            onChange={(e) => setEditedIsAdmin(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-white">Is Admin</span>
                        </label>
                      ) : (
                        <span className="text-white">
                          {selectedUser.isAdmin ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Created:</span>
                      <span className="text-white">
                        {new Date(selectedUser.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedUser.lastLoginAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Last Login:</span>
                        <span className="text-white">
                          {new Date(selectedUser.lastLoginAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Game State */}
                {selectedUser.gameState && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Game State
                    </h4>
                    {editing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-slate-300 mb-1">Coins:</label>
                          <input
                            type="number"
                            value={editedGameState?.coins || 0}
                            onChange={(e) =>
                              setEditedGameState({
                                ...editedGameState!,
                                coins: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-600 text-white px-3 py-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1">XP:</label>
                          <input
                            type="number"
                            value={editedGameState?.xp || 0}
                            onChange={(e) =>
                              setEditedGameState({
                                ...editedGameState!,
                                xp: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-600 text-white px-3 py-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1">Level:</label>
                          <input
                            type="number"
                            value={editedGameState?.level || 1}
                            onChange={(e) =>
                              setEditedGameState({
                                ...editedGameState!,
                                level: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full bg-slate-600 text-white px-3 py-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1">Inventory (JSON):</label>
                          <textarea
                            value={JSON.stringify(editedGameState?.inventory || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const inventory = JSON.parse(e.target.value);
                                setEditedGameState({
                                  ...editedGameState!,
                                  inventory,
                                });
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full bg-slate-600 text-white px-3 py-2 rounded font-mono text-sm"
                            rows={6}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            Coins:
                          </span>
                          <span className="text-white font-mono">
                            {selectedUser.gameState.coins?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">XP:</span>
                          <span className="text-white font-mono">
                            {selectedUser.gameState.xp?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Level:</span>
                          <span className="text-white font-mono">
                            {selectedUser.gameState.level || 1}
                          </span>
                        </div>
                        <div className="mt-3">
                          <span className="text-slate-300 block mb-1">Inventory:</span>
                          <pre className="bg-slate-600 p-2 rounded text-xs text-white overflow-auto max-h-40">
                            {JSON.stringify(selectedUser.gameState.inventory || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                Select a user to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

