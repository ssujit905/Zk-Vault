import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight } from 'lucide-react';

export const SetupScreen: React.FC = () => {
    const { setupVault } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await setupVault(password);
        } catch (err) {
            console.warn('Vault initialization sequence failed');
            setError('Failed to setup vault');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="glass-card w-full max-w-sm p-8 text-center">
                <div className="flex justify-center mb-6">
                    <img src="/icons/icon128.png" alt="Zk Vault" className="w-16 h-16 drop-shadow-lg" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Welcome to Zk Vault</h1>
                <p className="text-slate-400 mb-8 text-sm">
                    Create a strong master password to secure your encrypted vault. This password can be changed later, but it <b>cannot be recovered</b> if forgotten.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                            Master Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-glass"
                            placeholder="••••••••"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-glass"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? 'Securing Vault...' : 'Create Vault'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>
            </div>

            <p className="text-xs text-slate-500 mt-6 max-w-xs text-center">
                Zero-Knowledge Architecture: Your master password encrypts your data locally. We cannot reset it for you.
            </p>
        </div>
    );
};
