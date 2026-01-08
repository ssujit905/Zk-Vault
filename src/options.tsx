import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {
    Shield, CheckCircle, Lock, Crown, Zap, Database, Users,
    ShieldAlert, ShieldCheck, Upload, LogOut, AlertTriangle,
    Settings, CreditCard, HardDrive, Loader2
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider, useVault } from './context/VaultContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { auditVault, type AuditResult } from './utils/passwordAudit';
import { StatusPanel } from './components/StatusPanel';
import { createEncryptedBackup, restoreFromEncryptedBackup } from './utils/backup';
import { BillingPanel } from './components/BillingPanel';
import { analyticsService } from './services/analytics';
import { checkPasswordBreach, type BreachInfo } from './utils/breachCheck';

const SecurityAudit: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
    const { records } = useVault();
    const { tier } = useAuth();
    const [audit, setAudit] = useState<AuditResult | null>(null);
    const [breachResults, setBreachResults] = useState<Record<string, BreachInfo>>({});
    const [checkingBreaches, setCheckingBreaches] = useState(false);

    useEffect(() => {
        if (records.length > 0) {
            setAudit(auditVault(records));
        }
    }, [records]);

    useEffect(() => {
        const checkBreaches = async () => {
            if (tier !== 'pro' || records.length === 0 || checkingBreaches) return;

            setCheckingBreaches(true);
            const results: Record<string, BreachInfo> = {};

            // Limit concurrent requests to be polite to API
            const loginRecords = records.filter(r => r.type === 'login');

            for (const record of loginRecords) {
                const password = (record as any).password;
                if (password) {
                    const info = await checkPasswordBreach(password);
                    if (info.isPwned) {
                        results[record.id] = info;
                    }
                }
            }

            setBreachResults(results);
            setCheckingBreaches(false);
        };

        checkBreaches();
    }, [records, tier]);

    if (tier === 'free') {
        return (
            <div className="glass-card p-12 relative overflow-hidden group min-h-[450px] flex flex-col justify-center border-amber-500/20 bg-amber-500/[0.02]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-amber-500/20"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl -ml-24 -mb-24 transition-all group-hover:bg-primary-500/20"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <Shield className="text-amber-500" size={32} />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-4 leading-tight uppercase tracking-tighter">Professional Security Audit</h2>
                    <p className="text-slate-400 mb-8 max-w-sm leading-relaxed text-sm">
                        Protect your digital identity with Zk Vault's advanced auditing engine. Identify deep-web breaches, weak entropy, and duplicate credentials.
                    </p>

                    <button
                        onClick={() => {
                            analyticsService.trackEvent('attempt_pro_audit', { source: 'security_center' });
                            onNavigate?.('billing');
                        }}
                        className="group/btn relative px-10 py-4 bg-amber-500 text-black font-black rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_4px_30px_rgba(245,158,11,0.4)]"
                    >
                        <span className="flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                            Unlock Premium Audit
                            <Crown size={18} className="transition-transform group-hover/btn:rotate-12" />
                        </span>
                    </button>

                    <div className="mt-12 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-[10px] text-slate-500 font-black tracking-[0.25em] uppercase">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-amber-500/50"></div>
                            <span>Dark Web Scan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-amber-500/50"></div>
                            <span>Entropy Audit</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-amber-500/50"></div>
                            <span>Identity Theft Check</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!audit || records.length === 0) {
        return (
            <div className="glass-card p-12 text-center text-slate-500 italic">
                No passwords to audit. Add some items to your vault first.
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-400';
        if (score >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="glass-card p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Shield className="text-primary-400" size={24} />
                    <h2 className="text-2xl font-bold text-white leading-tight">Security Audit</h2>
                </div>
                {tier === 'pro' && (
                    <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2">
                        <Crown size={12} /> Pro Intelligence
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mb-10 p-6 sm:p-8 bg-white/[0.02] rounded-3xl border border-white/5 shadow-inner gap-6 text-center sm:text-left">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Vault Health Score</h3>
                    <p className="text-sm text-slate-400">Based on encryption entropy and reuse</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-[1px] bg-white/10 hidden sm:block"></div>
                    <div className={`text-5xl sm:text-6xl font-black tracking-tighter ${getScoreColor(audit.score)}`}>
                        {audit.score}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {checkingBreaches && (
                    <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl flex items-center justify-center gap-3">
                        <Loader2 size={16} className="animate-spin text-primary-400" />
                        <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Scanning Global Breaches...</span>
                    </div>
                )}

                {Object.keys(breachResults).length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest">
                            <ShieldAlert size={18} />
                            Compromised Credentials ({Object.keys(breachResults).length})
                        </h4>
                        <div className="space-y-3">
                            {records.filter(r => breachResults[r.id]).map(record => (
                                <div key={record.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-red-600/10 border border-red-500/20 rounded-xl text-sm group hover:bg-red-600/20 transition-all gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold break-all">{record.title}</span>
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Leak Detected in Global Database</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-red-500/20 rounded-full text-red-400 text-[10px] font-black uppercase whitespace-nowrap border border-red-500/30">
                                            Found {breachResults[record.id].count.toLocaleString()} times
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.reusedPasswords.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-yellow-500 font-bold text-sm uppercase tracking-widest">
                            <AlertTriangle size={18} />
                            Reused Passwords ({audit.reusedPasswords.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {audit.reusedPasswords.map((item, idx) => (
                                <div key={idx} className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-sm text-slate-300 font-medium break-all">
                                    {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.weakPasswords.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-amber-500 font-bold text-sm uppercase tracking-widest">
                            <Zap size={18} />
                            Weak Passwords ({audit.weakPasswords.length})
                        </h4>
                        <div className="space-y-3">
                            {audit.weakPasswords.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-sm group hover:bg-amber-500/10 transition-colors gap-2">
                                    <span className="text-slate-200 font-bold break-all">{item.title}</span>
                                    <span className="px-2 py-1 bg-amber-500/10 rounded-md text-amber-300 text-[10px] font-black uppercase whitespace-nowrap">{item.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.weakPasswords.length === 0 && audit.reusedPasswords.length === 0 && Object.keys(breachResults).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/20">
                            <CheckCircle size={40} className="text-green-500" />
                        </div>
                        <p className="font-bold text-lg text-white mb-2">Maximum Security Reached</p>
                        <p className="text-sm">Your passwords are unique, strong, and haven't and haven't been seen in known breaches.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SecuritySettings: React.FC = () => {
    const { changeMasterPassword } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 12) {
            setMsg({ type: 'error', text: 'New password must be at least 12 characters.' });
            return;
        }
        setLoading(true);
        setMsg({ type: '', text: '' });
        const success = await changeMasterPassword(oldPassword, newPassword);
        setLoading(false);
        if (success) {
            setMsg({ type: 'success', text: 'Master password updated successfully. Vault re-encrypted with new keys.' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setMsg({ type: 'error', text: 'Invalid current password. Encryption keys could not be derived.' });
        }
        setTimeout(() => setMsg({ type: '', text: '' }), 5000);
    };

    return (
        <div className="glass-card p-8 animate-fade-in max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
                <Lock className="text-primary-400" size={24} />
                <h2 className="text-lg font-black text-white tracking-[0.2em] uppercase leading-tight">Master Password</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
                {msg.text && (
                    <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {msg.text}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest pl-1">Current Master Password</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="input-glass"
                            required
                            placeholder="••••••••••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest pl-1">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-glass"
                            required
                            placeholder="••••••••••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest pl-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-glass"
                            required
                            placeholder="••••••••••••••••"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest rounded-xl"
                    >
                        {loading ? 'Re-encrypting Vault...' : 'Update Master Password'}
                    </button>
                    <p className="mt-4 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Your entire vault will be re-encrypted with new keys
                    </p>
                </div>
            </form>
        </div>
    );
};

const DataManagement: React.FC = () => {
    const { records, addRecords, loading: vaultLoading } = useVault();
    const { lock } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    const handleEncryptedExport = async () => {
        const password = prompt('Enter a password to encrypt this backup. Use a STRONG password.');
        if (!password) return;
        try {
            setImporting(true);
            const backup = await createEncryptedBackup(records, password);
            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zk-vault-secure-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatusMsg({ type: 'success', text: 'Encrypted Zero-Knowledge backup created successfully.' });
        } catch (error: any) {
            setStatusMsg({ type: 'error', text: `Backup failed: ${error.message}` });
        } finally {
            setImporting(false);
            setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
        }
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setStatusMsg({ type: 'info', text: 'Analyzing data format...' });
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                let importedRecords: any[] = [];
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    if (data.ciphertext && data.salt && data.iv) {
                        const password = prompt('Enter the backup password:');
                        if (!password) return;
                        importedRecords = await restoreFromEncryptedBackup(data, password);
                    } else {
                        importedRecords = data;
                    }
                }
                if (importedRecords.length > 0) {
                    await addRecords(importedRecords);
                    setStatusMsg({ type: 'success', text: `Successfully restored ${importedRecords.length} records.` });
                }
            } catch (error: any) {
                setStatusMsg({ type: 'error', text: `Import failed: ${error.message}` });
            } finally {
                setImporting(false);
                setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
                    <Database className="text-primary-400" size={24} />
                    <h2 className="text-lg font-black text-white tracking-[0.2em] uppercase leading-tight">Vault Control</h2>
                </div>

                {statusMsg.text && (
                    <div className={`mb-8 p-4 rounded-xl text-xs font-bold border ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        statusMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-primary-500/10 text-primary-400 border-primary-500/20'
                        }`}>
                        {statusMsg.text}
                    </div>
                )}

                <div className="flex flex-col gap-10">
                    {/* Export Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            <ShieldCheck size={14} className="text-primary-400" />
                            Data Portability
                        </div>
                        <h3 className="text-xl font-bold text-white">Export Secure Backup</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            Create a secure, encrypted backup of all your data. This file is cryptographically locked and cannot be read without your chosen backup password.
                        </p>
                        <button
                            onClick={handleEncryptedExport}
                            className="btn-primary w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-4 rounded-xl"
                            disabled={vaultLoading || importing}
                        >
                            <ShieldCheck size={18} />
                            Generate Encrypted Export
                        </button>
                    </div>

                    {/* Import Section */}
                    <div className="space-y-4 pt-10 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            <Upload size={14} className="text-amber-500" />
                            Data Migration
                        </div>
                        <h3 className="text-xl font-bold text-white">Restore / Import Data</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            Restore a previous Zk Vault backup or import credentials from compatible password managers. Please upload your data in <b>.json</b> format.
                        </p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        <button
                            onClick={handleImportClick}
                            className="btn-secondary w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-4 rounded-xl"
                            disabled={importing || vaultLoading}
                        >
                            <Upload size={18} />
                            {importing ? 'Processing Data...' : 'Upload & Restore backup'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Emergency Zone */}
            <div className="glass-card p-8 border-red-900/20 bg-red-950/5">
                <div className="flex items-center gap-3 mb-6 text-red-500 border-b border-red-500/10 pb-4">
                    <AlertTriangle size={24} />
                    <h2 className="text-lg font-black tracking-[0.2em] uppercase leading-tight">Emergency Zone</h2>
                </div>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500 leading-relaxed">
                        This action will <span className="text-red-500 font-bold uppercase tracking-tight">permanently wipe</span> your local vault and all settings. Data cannot be recovered unless you have an external backup file.
                    </p>
                    <button
                        className="btn-danger w-full py-4 text-xs font-black uppercase tracking-widest rounded-xl"
                        onClick={() => {
                            if (confirm('CRITICAL: This will destroy your local vault permanently. Proceed?')) {
                                chrome.storage.local.clear(() => chrome.runtime.reload());
                            }
                        }}
                    >
                        Destroy and Reset Local Vault
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={lock} className="btn-secondary flex-1 py-4 text-xs font-black tracking-widest uppercase">Logout</button>
                <button
                    onClick={() => {
                        lock();
                        chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
                    }}
                    className="btn-danger flex-[2] py-4 text-xs font-black tracking-widest uppercase bg-red-600/10 border-red-500/20 hover:bg-red-600 shadow-xl shadow-red-900/10"
                >
                    <Zap size={14} className="inline mr-2" />
                    Emergency Panic Lock
                </button>
            </div>
        </div>
    );
};

const FamilySharing: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
    const { tier } = useAuth();

    if (tier !== 'family') {
        return (
            <div className="glass-card p-12 flex flex-col items-center text-center animate-fade-in max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mb-8 ring-1 ring-primary-500/30">
                    <Users className="text-primary-400" size={40} />
                </div>
                <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Family Vault Sharing</h2>
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest mb-6">
                    Coming Soon to Zk Vault
                </div>
                <p className="text-slate-400 max-w-sm mb-10 text-sm leading-relaxed">
                    Securely share logins and cards with up to 5 family members using end-to-end ZK encryption. Our engineering team is currently building the secure key-exchange protocol for this feature.
                </p>
                <button
                    onClick={() => onNavigate?.('billing')}
                    className="btn-primary px-12 py-4 text-xs font-black uppercase tracking-widest"
                >
                    Upgrade to Family Plan
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="glass-card p-8 bg-blue-950/5 border-blue-500/20 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/[0.02] pointer-events-none"></div>
                <div className="relative z-10 py-12">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto ring-1 ring-blue-500/20">
                        <Users className="text-blue-400" size={32} />
                    </div>
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <h2 className="text-lg font-black text-white tracking-[0.2em] uppercase">Family Center</h2>
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest">
                            Under Development
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-10">
                        The Family & Teams sharing infrastructure is currently being audited for zero-knowledge security compliance. Secure member invitations and shared vaults will be activated in an upcoming release.
                    </p>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                        <button
                            disabled
                            className="w-full py-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-not-allowed"
                        >
                            Invitations Locked
                        </button>
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                            Estimated Deployment: Q1 2026
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OptionsContent: React.FC = () => {
    const { isAuthenticated, loading, tier, lock } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '');
            if (['dashboard', 'audit', 'family', 'password', 'data', 'billing'].includes(hash)) {
                setActiveView(hash);
            } else {
                setActiveView('dashboard');
            }
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateView = (view: string) => {
        window.location.hash = view;
        setActiveView(view);
        setIsDropdownOpen(false);
    };

    if (loading) return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
            <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
    );

    if (!isAuthenticated) return <LoginScreen />;

    const renderView = () => {
        switch (activeView) {
            case 'audit': return <SecurityAudit onNavigate={updateView} />;
            case 'family': return <FamilySharing onNavigate={updateView} />;
            case 'password': return <SecuritySettings />;
            case 'data': return <DataManagement />;
            case 'billing': return <BillingPanel />;
            case 'dashboard':
            default: return <StatusPanel onNavigate={updateView} />;
        }
    };

    const getViewTitle = () => {
        switch (activeView) {
            case 'audit': return 'Security Audit';
            case 'family': return 'Family Center';
            case 'password': return 'Manage Keys';
            case 'data': return 'Vault Control';
            case 'billing': return 'Subscription';
            case 'dashboard':
            default: return 'Live Status';
        }
    };

    return (
        <div className="min-h-screen bg-[#02040a] text-slate-200 selection:bg-primary-500/30">
            <header className="sticky top-0 z-50 w-full bg-[#02040a]/80 backdrop-blur-2xl border-b border-white/[0.03]">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => updateView('dashboard')}>
                        <img src="/icons/icon48.png" alt="Zk Vault" className="w-10 h-10 drop-shadow-md group-hover:scale-110 transition-transform" />
                        <span className="text-xl font-black text-white tracking-tight uppercase hidden sm:block">Zk Vault</span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 relative" ref={dropdownRef}>
                        <button
                            onClick={() => updateView('billing')}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border transition-all ${tier === 'free' ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/10' :
                                tier === 'pro' ? 'border-amber-500 text-amber-500 bg-amber-500/5 cursor-default' :
                                    'border-primary-500 text-primary-400 bg-primary-500/5 cursor-default'
                                }`}
                        >
                            {tier !== 'free' ? <Crown size={14} /> : <Zap size={14} className="animate-pulse" />}
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{tier} Tier</span>
                        </button>

                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`p-2 rounded-xl transition-all ${isDropdownOpen ? 'bg-primary-500/10 text-primary-400 ring-1 ring-primary-400/50' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Settings size={22} className={isDropdownOpen ? 'animate-spin-slow' : ''} />
                        </button>

                        {/* DESKTOP/MOBILE SETTINGS DROPDOWN */}
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-3 w-64 bg-slate-950 border border-white/5 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-3xl overflow-hidden ring-1 ring-white/10">
                                <div className="px-4 py-3 mb-2 border-b border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Vault Control</p>
                                    <p className="text-xs text-white font-bold opacity-80">Manage your security</p>
                                </div>

                                <div className="space-y-1">
                                    {[
                                        { id: 'dashboard', label: 'Main Dashboard', icon: ShieldCheck },
                                        { id: 'audit', label: 'Security Audit', icon: ShieldCheck },
                                        { id: 'family', label: 'Family Center', icon: Users },
                                        { id: 'password', label: 'Update Password', icon: Lock },
                                        { id: 'data', label: 'Export Backup', icon: HardDrive },
                                        { id: 'data', label: 'Import Data', icon: Upload },
                                        { id: 'billing', label: 'Subscription', icon: CreditCard },
                                    ].map((item, idx) => (
                                        <button
                                            key={`${item.id}-${idx}`}
                                            onClick={() => updateView(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeView === item.id ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <item.icon size={16} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                    <button
                                        onClick={() => {
                                            lock();
                                            chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <Zap size={16} />
                                        Panic Lock
                                    </button>
                                    <button
                                        onClick={lock}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <LogOut size={16} />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-5xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
                <div className="mb-12 flex flex-col items-center text-center border-b border-white/5 pb-8 gap-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-[0.2em] mb-3 break-words uppercase">{getViewTitle()}</h1>
                        <p className="text-slate-500 font-medium font-mono text-[10px] uppercase tracking-[0.3em]">Status: <span className="text-green-500 animate-pulse">Authorized Session</span></p>
                    </div>
                    <div className="w-full max-w-sm">
                        <StatusPanel compact />
                    </div>
                </div>

                <div className="animate-fade-in pb-20">
                    {renderView()}
                </div>
            </main>

            <footer className="max-w-5xl mx-auto px-6 sm:px-8 py-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-600 font-bold text-[9px] uppercase tracking-[0.4em]">
                <div>Zk Vault • Zero-Knowledge Core v1.0</div>
                <div className="flex gap-6">
                    <span className="hover:text-white transition-colors cursor-pointer">Security Protocol</span>
                    <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
                </div>
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <VaultProvider>
                <OptionsContent />
            </VaultProvider>
        </AuthProvider>
    </React.StrictMode>
);
