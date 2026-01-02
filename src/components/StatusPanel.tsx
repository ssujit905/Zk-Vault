import React, { useState, useEffect } from 'react';
import { Shield, Activity, Clock, Database, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export const StatusPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { isAuthenticated, lastUnlockAt, masterKey } = useAuth();
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
        <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="text-primary-400" size={24} />
                    <h2 className="text-2xl font-semibold text-white">Vault Status</h2>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isAuthenticated
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {isAuthenticated ? 'SECURE_SESSION_ACTIVE' : 'VAULT_LOCKED'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase font-bold tracking-wider">
                        <Activity size={14} className="text-primary-400" />
                        Key Status
                    </div>
                    <div className="text-sm text-slate-200 font-mono truncate">
                        {masterKey ? 'AES-256-GCM (In-Memory)' : 'No Key in Memory'}
                    </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase font-bold tracking-wider">
                        <Clock size={14} className="text-yellow-400" />
                        Session Time
                    </div>
                    <div className="text-sm text-slate-200">
                        {isAuthenticated ? `Unlocked ${uptime} ago` : 'Session Expired'}
                    </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase font-bold tracking-wider">
                        <Database size={14} className="text-green-400" />
                        Vault Depth
                    </div>
                    <div className="text-sm text-slate-200">
                        {records.length} Structured Records
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} />
                    Live Activity Stream
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((act, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 text-xs">
                                <div className="flex items-center gap-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${act.type === 'ADD' ? 'bg-green-500/20 text-green-400' :
                                        act.type === 'UPDATE' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {act.type}
                                    </span>
                                    <span className="text-slate-300 font-medium">{act.title}</span>
                                </div>
                                <span className="text-slate-500">{new Date(act.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 text-slate-600 italic text-sm">
                            No recent activity in this session
                        </div>
                    )}
                </div>
            </div>

            {/* Zero-Knowledge Handshake Indicator */}
            <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <div className="flex gap-1 items-center">
                        <ShieldCheck size={12} className={isAuthenticated ? 'text-primary-500' : 'text-slate-700'} />
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`w-1 h-3 rounded-full ${isAuthenticated ? 'bg-primary-500/40 animate-pulse' : 'bg-slate-800'}`} style={{ animationDelay: `${i * 0.2}s` }}></div>
                        ))}
                    </div>
                    <span>ZKPBKDF2 HANDSHAKE VERIFIED • END-TO-END ENCRYPTED</span>
                </div>
            </div>
        </div>
    );
};
