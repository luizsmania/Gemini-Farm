
import React, { useState } from 'react';
import { Button } from './Button';
import { Sprout, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { loginUser, registerUser } from '../services/authService';
import { User as UserType } from '../types';

interface AuthScreenProps {
  onSuccess: (user: UserType) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (!isLogin) {
      // Registration validation
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      // Login validation
      if (password.length < 4) {
        setError('Password is required.');
        return;
      }
    }

    setLoading(true);

    try {
      const result = isLogin 
        ? await loginUser(username, password)
        : await registerUser(username, password);

      if (result.success && result.user) {
        onSuccess(result.user);
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/50">
                <Sprout className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Gemini Farm</h1>
            <p className="text-slate-400">Tycoon & Farming Simulator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="Enter username"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Password {!isLogin && <span className="text-slate-500 normal-case">(min. 6 characters)</span>}
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="••••••••"
                        required
                        minLength={isLogin ? 4 : 6}
                    />
                </div>
            </div>

            {!isLogin && (
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                    )}
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            <Button 
                type="submit" 
                fullWidth 
                size="lg"
                disabled={loading}
                className="mt-6 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? "Login" : "Create Account")}
                {!loading && <ArrowRight size={18} />}
            </Button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
                {isLogin ? "New to the farm?" : "Already have a farm?"}
                <button 
                    onClick={() => { 
                        setIsLogin(!isLogin); 
                        setError(''); 
                        setPassword('');
                        setConfirmPassword('');
                    }}
                    className="ml-2 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                >
                    {isLogin ? "Sign Up" : "Login"}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};
