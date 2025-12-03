import React, { useState } from 'react';
import { loginUser } from '../services/supabase';
import { Button } from './Button';
import { Lock, User } from 'lucide-react';
import { Input } from './Input';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pin) {
      setError('Please enter both Name and PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await loginUser(name.trim(), pin);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Invalid Name or PIN');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid Name or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl shadow-black/50 border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-inner">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 text-center mt-1">Enter credentials to access Mooco Manager</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
             <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={20} />
                </div>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-0 outline-none transition-colors text-slate-800 font-medium"
                    autoFocus
                    autoComplete="name"
                />
             </div>

             <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={20} />
                </div>
                <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN (4 digits)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-0 outline-none transition-colors text-slate-800 font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal"
                    autoComplete="current-password"
                />
             </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium animate-pulse border border-red-100 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            fullWidth 
            isLoading={loading}
            disabled={!name || pin.length < 4}
            className="mt-2"
          >
            Access Dashboard
          </Button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">Restricted Access • Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
};