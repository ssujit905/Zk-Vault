import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Unlock } from 'lucide-react';

export const LoginScreen: React.FC = () => {
    const { unlock } = useAuth();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        // Small artificial delay for UX and to prevent brute force speed (locally)
        await new Promise(r => setTimeout(r, 300));

        const success = await unlock(password);
        if (!success) {
            setError(true);
            setLoading(false);
            // Animation reset
            setTimeout(() => setError(false), 500);
        }
        // If success, AuthContext state changes, and this component unmounts
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className={`glass-card w-full max-w-sm p-8 text-center transition-transform ${error ? 'translate-x-[10px]' : ''}`}
                style={{ transform: error ? 'translateX(10px)' : undefined }}>
                {/* Note: Simple shake animation logic is better handled with CSS keyframes, 
            but keeping simpler React state here for basic feedback */}

                <div className="flex justify-center mb-6">
                    <div className={`p-4 rounded-full shadow-lg transition-colors duration-300 ${error ? 'bg-red-500/20 shadow-red-500/30' : 'bg-primary-500/10 shadow-primary-500/20'
                        }`}>
                        <img src="/icons/icon128.png" alt="Logo" className="w-12 h-12 object-contain" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Unlock Vault</h1>
                <p className="text-slate-400 mb-8 text-sm">
                    Enter your master password to access your credentials.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`input-glass text-center text-lg tracking-widest ${error ? 'border-red-500/50 ring-2 ring-red-500/20' : ''
                                }`}
                            placeholder="••••••••"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? <Unlock size={18} className="animate-pulse" /> : 'Unlock'}
                    </button>
                </form>
            </div>

            {error && (
                <p className="text-red-400 text-sm mt-4 font-medium animate-fade-in">
                    Incorrect password
                </p>
            )}
        </div>
    );
};
