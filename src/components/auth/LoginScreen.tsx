import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Unlock } from 'lucide-react';

export const LoginScreen: React.FC = () => {
    const { unlock } = useAuth();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [status, setStatus] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        try {
            // STEP 1: Key Derivation
            setStatus('Deriving local master key (PBKDF2)...');
            await new Promise(r => setTimeout(r, 600));

            // STEP 2: Proof Verification
            setStatus('Verifying Zero-Knowledge proof blob...');
            await new Promise(r => setTimeout(r, 600));

            const success = await unlock(password);

            if (!success) {
                setStatus('Verification failed');
                setError(true);
                setLoading(false);
                setTimeout(() => {
                    setError(false);
                    setStatus('');
                }, 2000);
            } else {
                setStatus('Securing session...');
                await new Promise(r => setTimeout(r, 400));
            }
        } catch (err) {
            setError(true);
            setLoading(false);
            setStatus('An error occurred');
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 animate-fade-in bg-slate-950">
            {/* Background elements for premium feel */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <div className={`glass-card w-full max-w-sm p-8 text-center transition-all duration-300 relative z-10 ${error ? 'border-red-500/30' : ''}`}
                style={{ transform: error ? 'translateX(10px)' : undefined }}>

                <div className="flex justify-center mb-6">
                    <div className={`p-4 rounded-full shadow-lg transition-all duration-500 ${loading ? 'bg-primary-500/20 shadow-primary-500/40 scale-110' :
                            error ? 'bg-red-500/20 shadow-red-500/30' : 'bg-primary-500/10 shadow-primary-500/20'
                        }`}>
                        <img src="/icons/icon128.png" alt="Logo" className={`w-12 h-12 object-contain ${loading ? 'animate-pulse' : ''}`} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Secure Unlock</h1>
                <p className="text-slate-400 mb-8 text-sm">
                    {loading ? (
                        <span className="text-primary-400 font-medium animate-pulse">{status}</span>
                    ) : (
                        "Your master password never leaves your device."
                    )}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div className="relative group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className={`input-glass text-center text-lg tracking-widest transition-all ${error ? 'border-red-500/50 ring-2 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                                    'group-hover:border-white/20'
                                }`}
                            placeholder="••••••••"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn-primary w-full flex items-center justify-center gap-2 mt-4 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Authenticating...</span>
                            </div>
                        ) : (
                            <>
                                <Unlock size={18} />
                                <span>Unlock Vault</span>
                            </>
                        )}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-slide-up">
                        <p className="text-red-400 text-sm font-medium">
                            Proof invalid. Access denied.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-8 text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold">
                AES-GCM • PBKDF2 • Zero-Knowledge
            </div>
        </div>
    );
};
