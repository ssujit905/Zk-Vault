import React, { useState, useEffect } from 'react';
import { Shield, Activity, Clock, Database, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { analyticsService } from '../services/analytics';

export const StatusPanel: React.FC<{ compact?: boolean; onNavigate?: (view: string) => void }> = ({ compact = false, onNavigate }) => {
    const { isAuthenticated, lastUnlockAt, masterKey, tier } = useAuth();
    const { records, recentActivity } = useVault();
    const [uptime, setUptime] = useState<string>('0m');

    useEffect(() => {
        if (!lastUnlockAt) return;
        const updateUptime = () => {
            const diff = Date.now() - lastUnlockAt;
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setUptime(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
        };
        updateUptime();
        const interval = setInterval(updateUptime, 1000);
        return () => clearInterval(interval);
    }, [lastUnlockAt]);

    if (compact) {
        return (
            <div className="flex items-center gap-4 px-3 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                    {isAuthenticated ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    )}
                    <span>{isAuthenticated ? 'UNLOCKED' : 'LOCKED'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Database size={12} />
                    <span>{records.length} ITEMS</span>
                </div>
                {isAuthenticated && (
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{uptime}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="glass-card p-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="text-primary-400" size={24} />
                    <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Vault Intelligence</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${tier === 'free' ? 'bg-slate-500/10 text-slate-500 border-white/5' :
                        tier === 'pro' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                            'bg-primary-500/10 text-primary-400 border-primary-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                        }`}>
                        {tier} Subscription
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${isAuthenticated
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                        {isAuthenticated ? 'Secure Session' : 'Locked'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-3 uppercase font-black tracking-[0.2em] group-hover:text-primary-400 transition-colors">
                        <Activity size={14} className="text-primary-500" />
                        Memory Status
                    </div>
                    <div className="text-sm text-slate-200 font-mono flex items-center gap-2">
                        {masterKey ? (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                AES-256-GCM
                            </>
                        ) : 'No Keys Loaded'}
                    </div>
                </div>

                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-3 uppercase font-black tracking-[0.2em] group-hover:text-amber-400 transition-colors">
                        <Clock size={14} className="text-amber-500" />
                        Session Uptime
                    </div>
                    <div className="text-sm text-slate-200 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                        {isAuthenticated ? uptime : 'Offline'}
                    </div>
                </div>

                <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-3 uppercase font-black tracking-[0.2em] group-hover:text-green-400 transition-colors">
                        <Database size={14} className="text-green-500" />
                        Total Items
                    </div>
                    <div className="text-sm text-slate-200 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        {records.length} Encrypted Records
                    </div>
                </div>
            </div>

            {tier !== 'free' ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" />
                            Live Secure Activity
                        </h3>
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Real-time Stream</span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-3">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((act, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 text-xs group hover:bg-white/[0.04] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <span className={`w-2 h-2 rounded-full ${act.type === 'ADD' ? 'bg-green-500' :
                                            act.type === 'UPDATE' ? 'bg-blue-500' :
                                                'bg-red-500'
                                            } shadow-[0_0_8px_currentColor] opacity-50`}>
                                        </span>
                                        <span className="text-slate-300 font-bold uppercase tracking-tight">{act.title}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${act.type === 'ADD' ? 'text-green-500/50' :
                                            act.type === 'UPDATE' ? 'text-blue-500/50' : 'text-red-500/50'
                                            }`}>{act.type}</span>
                                    </div>
                                    <span className="text-slate-600 font-mono text-[10px]">{new Date(act.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-slate-600 italic text-sm border-2 border-dashed border-white/5 rounded-2xl">
                                No activity recorded in this session.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-10 bg-amber-500/[0.02] rounded-3xl border-2 border-dashed border-amber-500/10 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-500/[0.02] pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto ring-1 ring-amber-500/20">
                            <Zap className="text-amber-500" size={24} />
                        </div>
                        <h4 className="text-white font-bold mb-2 uppercase tracking-tight">Security Stream Locked</h4>
                        <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">Upgrade to <span className="text-amber-500 font-black">PRO</span> to unlock real-time activity tracking and visual encryption handshakes.</p>
                        <button
                            onClick={() => {
                                analyticsService.trackEvent('attempt_pro_features', { source: 'status_panel' });
                                onNavigate?.('billing');
                            }}
                            className="px-6 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-900/10"
                        >
                            Explore Pro Features
                        </button>
                    </div>
                </div>
            )}

            {/* Zero-Knowledge Handshake Indicator */}
            <div className="pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                    <div className="flex gap-1.5 items-center">
                        <ShieldCheck size={14} className={isAuthenticated ? 'text-primary-500' : 'text-slate-800'} />
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i}
                                className={`w-1 h-3 rounded-full transition-all duration-700 ${isAuthenticated
                                    ? (tier !== 'free' ? 'bg-primary-500 group-hover:bg-primary-400 animate-pulse' : 'bg-primary-500/20')
                                    : 'bg-slate-900'
                                    }`}
                                style={{
                                    animationDelay: `${i * 0.15}s`,
                                    opacity: isAuthenticated ? 1 - (i * 0.1) : 0.2
                                }}
                            ></div>
                        ))}
                    </div>
                    <span className={isAuthenticated ? 'text-primary-500/80' : ''}>
                        {tier !== 'free' ? 'ZKPBKDF2 SHA-256 HANDSHAKE ACTIVE' : 'Encrypted Session Active'}
                    </span>
                </div>
            </div>
        </div>
    );
};
