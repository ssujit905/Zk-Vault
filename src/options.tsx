import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {
    Shield, CheckCircle, Lock, Crown, Zap, LayoutDashboard,
    Database, Key, Users, Heart, ShieldAlert, ShieldCheck, Upload,
    LogOut, AlertTriangle
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider, useVault } from './context/VaultContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { auditVault, type AuditResult } from './utils/passwordAudit';
import { StatusPanel } from './components/StatusPanel';
import { createEncryptedBackup, restoreFromEncryptedBackup } from './utils/backup';
import { BillingPanel } from './components/BillingPanel';
import { analyticsService } from './services/analytics';
import { storageService } from './services/storage';
import type { FamilyMember } from './types';

const SecurityAudit: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
    const { records } = useVault();
    const { tier } = useAuth();
    const [audit, setAudit] = useState<AuditResult | null>(null);

    React.useEffect(() => {
        if (records.length > 0) {
            setAudit(auditVault(records));
        }
    }, [records]);

    if (tier === 'free') {
        return (
            <div className="glass-card p-8 relative overflow-hidden group min-h-[400px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-amber-500/20"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl -ml-24 -mb-24 transition-all group-hover:bg-primary-500/20"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <Shield className="text-amber-500" size={32} />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3">Professional Security Audit</h2>
                    <p className="text-slate-400 mb-8 max-w-sm leading-relaxed text-sm">
                        Identify weak passwords, reused credentials, and check for dark web breaches with our advanced auditing engine.
                    </p>

                    <button
                        onClick={() => {
                            analyticsService.trackEvent('attempt_security_audit');
                            onNavigate?.('billing');
                        }}
                        className="group/btn relative px-8 py-3 bg-amber-500 text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(245,158,11,0.4)]"
                    >
                        <span className="flex items-center gap-2 text-sm uppercase tracking-widest">
                            Unlock with Pro
                            <Crown size={18} className="transition-transform group-hover/btn:rotate-12" />
                        </span>
                    </button>

                    <div className="mt-8 flex items-center gap-6 text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">
                        <span>Breach Scan</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                        <span>Entropy Check</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                        <span>Dark Web Audit</span>
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
                    <h2 className="text-2xl font-bold text-white">Security Audit</h2>
                </div>
                {tier === 'pro' && (
                    <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2">
                        <Crown size={12} /> Pro Intelligence
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mb-10 p-8 bg-white/[0.02] rounded-3xl border border-white/5 shadow-inner">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Vault Health Score</h3>
                    <p className="text-sm text-slate-400">Based on encryption entropy and reuse</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-[1px] bg-white/10 hidden sm:block"></div>
                    <div className={`text-6xl font-black tracking-tighter ${getScoreColor(audit.score)}`}>
                        {audit.score}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {audit.reusedPasswords.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-yellow-500 font-bold text-sm uppercase tracking-widest">
                            <AlertTriangle size={18} />
                            Reused Passwords ({audit.reusedPasswords.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {audit.reusedPasswords.map((item, idx) => (
                                <div key={idx} className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-sm text-slate-300 font-medium">
                                    {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.weakPasswords.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest">
                            <ShieldAlert size={18} />
                            Weak Passwords ({audit.weakPasswords.length})
                        </h4>
                        <div className="space-y-3">
                            {audit.weakPasswords.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-sm group hover:bg-red-500/10 transition-colors">
                                    <span className="text-slate-200 font-bold">{item.title}</span>
                                    <span className="px-2 py-1 bg-red-500/10 rounded-md text-red-300 text-[10px] font-black uppercase">{item.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.weakPasswords.length === 0 && audit.reusedPasswords.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/20">
                            <CheckCircle size={40} className="text-green-500" />
                        </div>
                        <p className="font-bold text-lg text-white mb-2">Maximum Security Reached</p>
                        <p className="text-sm">Your passwords are unique and cryptographically strong.</p>
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
        <div className="glass-card p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <Lock className="text-primary-400" size={24} />
                <h2 className="text-2xl font-bold text-white">Security Settings</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {msg.text && (
                    <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {msg.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full md:w-auto px-10 py-4 text-xs font-black uppercase tracking-widest"
                >
                    {loading ? 'Re-encrypting Vault...' : 'Update Master Password'}
                </button>
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
        <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-8">
                    <Database className="text-primary-400" size={24} />
                    <h2 className="text-2xl font-bold text-white">Data Control</h2>
                </div>

                {statusMsg.text && (
                    <div className={`mb-6 p-4 rounded-xl text-xs font-bold border ${statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        statusMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-primary-500/10 text-primary-400 border-primary-500/20'
                        }`}>
                        {statusMsg.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white">Export & Backup</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            Create a secure, encrypted backup of all your data. This data cannot be read without the backup password.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleEncryptedExport}
                                className="btn-primary flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-4"
                                disabled={vaultLoading || importing}
                            >
                                <ShieldCheck size={18} />
                                Secure Backup
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-10">
                        <h3 className="text-lg font-bold text-white">Restore Data</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            Import passwords from other managers or restore a previous Zk Vault backup.
                        </p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        <button
                            onClick={handleImportClick}
                            className="btn-secondary w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-4"
                            disabled={importing || vaultLoading}
                        >
                            <Upload size={18} />
                            {importing ? 'Processing...' : 'Restore from Backup'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-card p-8 border-red-900/20 bg-red-950/5">
                <div className="flex items-center gap-3 mb-6 text-red-500">
                    <AlertTriangle size={24} />
                    <h2 className="text-2xl font-bold">Destroy All Data</h2>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-sm text-slate-500 max-w-lg">
                        This action will wipe your local vault and settings. Data cannot be recovered unless you have a backup file and password.
                    </p>
                    <button
                        className="btn-danger w-full md:w-auto px-8 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap"
                        onClick={() => {
                            if (confirm('CRITICAL: This will destroy your local vault permanently. Proceed?')) {
                                chrome.storage.local.clear(() => chrome.runtime.reload());
                            }
                        }}
                    >
                        Factory Reset Vault
                    </button>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
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

// Family Only Component
const FamilySharing: React.FC = () => {
    const { tier } = useAuth();
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        const data = await storageService.getFamilyMembers();
        setMembers(data);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call/Email
        await new Promise(r => setTimeout(r, 1000));

        const member: FamilyMember = {
            id: crypto.randomUUID(),
            name: newMember.name,
            email: newMember.email,
            status: 'pending',
            role: 'member',
            emergencyAccess: false,
            addedAt: Date.now()
        };

        const updated = [...members, member];
        await storageService.saveFamilyMembers(updated);
        setMembers(updated);
        setNewMember({ name: '', email: '' });
        setShowAddModal(false);
        setLoading(false);
        analyticsService.trackEvent('family_member_invited');
    };

    const removeMember = async (id: string) => {
        if (!confirm('Are you sure? This will revoke their access.')) return;
        const updated = members.filter(m => m.id !== id);
        await storageService.saveFamilyMembers(updated);
        setMembers(updated);
    };

    const toggleEmergency = async (id: string) => {
        const updated = members.map(m =>
            m.id === id ? { ...m, emergencyAccess: !m.emergencyAccess } : m
        );
        await storageService.saveFamilyMembers(updated);
        setMembers(updated);
    };

    if (tier !== 'family') {
        return (
            <div className="glass-card p-12 flex flex-col items-center text-center animate-fade-in">
                <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mb-8 ring-1 ring-primary-500/30">
                    <Users className="text-primary-400" size={40} />
                </div>
                <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Family Vault Sharing</h2>
                <p className="text-slate-400 max-w-sm mb-10 text-sm leading-relaxed">
                    Securely share logins and cards with up to 5 family members using end-to-end ZK encryption.
                </p>
                <button
                    onClick={() => window.location.hash = '#subscription'}
                    className="btn-primary px-12 py-4 text-xs font-black uppercase tracking-widest"
                >
                    Upgrade to Family
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-8 bg-blue-950/5 border-blue-500/20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Users className="text-blue-400" size={24} />
                        <h2 className="text-2xl font-bold text-white">Family Center</h2>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={members.length >= 5}
                        className="btn-primary flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Invite Member ({members.length}/5)
                    </button>
                </div>

                {members.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl">
                        <Heart className="text-slate-700 mx-auto mb-4" size={48} />
                        <p className="text-slate-500 font-medium">No family members yet.</p>
                        <p className="text-slate-600 text-xs mt-1">Invite your family to protect them.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {members.map(member => (
                            <div key={member.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${member.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white">{member.name}</h4>
                                            {member.role === 'admin' && <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 text-[9px] rounded font-black uppercase">Admin</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            {member.email} •
                                            <span className={member.status === 'active' ? 'text-green-500' : 'text-amber-500'}>
                                                {member.status === 'active' ? 'Protected' : 'Invite Sent'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <label className="text-[9px] font-black uppercase text-slate-600 mb-1 cursor-help" title="Allows access to vault in emergency">Emergency Access</label>
                                        <button
                                            onClick={() => toggleEmergency(member.id)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${member.emergencyAccess ? 'bg-red-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${member.emergencyAccess ? 'translate-x-5' : ''}`}></div>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => removeMember(member.id)}
                                        className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card max-w-md w-full p-8 border-primary-500/30">
                        <h3 className="text-xl font-bold text-white mb-6">Invite Family Member</h3>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-glass"
                                    placeholder="Sarah Connor"
                                    value={newMember.name}
                                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="input-glass"
                                    placeholder="sarah@example.com"
                                    value={newMember.email}
                                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 font-bold text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] btn-primary py-3 text-xs font-black uppercase tracking-widest"
                                >
                                    {loading ? 'Sending Invite...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const OptionsContent: React.FC = () => {
    const { isAuthenticated, loading, tier, lock } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');

    // Sync state with URL hash
    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '');
            if (['dashboard', 'audit', 'security', 'data', 'billing', 'family'].includes(hash)) {
                setActiveView(hash);
            }
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    const updateView = (view: string) => {
        window.location.hash = view;
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
            case 'security': return <SecuritySettings />;
            case 'data': return <DataManagement />;
            case 'billing': return <BillingPanel />;
            case 'family': return <FamilySharing />;
            default: return <StatusPanel onNavigate={updateView} />;
        }
    };

    const getViewTitle = () => {
        switch (activeView) {
            case 'audit': return 'Security Brain';
            case 'security': return 'Lockbox Settings';
            case 'data': return 'Vault Control';
            case 'billing': return 'Subscription';
            case 'family': return 'Sharing Center';
            default: return 'Main Dashboard';
        }
    };

    return (
        <div className="min-h-screen bg-[#02040a] text-slate-200">
            {/* CLEAN NAV BAR */}
            <header className="sticky top-0 z-50 w-full bg-[#02040a]/80 backdrop-blur-2xl border-b border-white/[0.03]">
                <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => updateView('dashboard')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-700 p-[1px] shadow-lg shadow-primary-900/20 group-hover:scale-110 transition-transform">
                            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                                <Shield className="text-primary-400" size={18} />
                            </div>
                        </div>
                        <span className="text-xl font-black text-white tracking-tight uppercase">Zk Vault</span>
                    </div>

                    <nav className="hidden lg:flex items-center gap-2">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                            { id: 'audit', label: 'Security', icon: Shield },
                            { id: 'security', label: 'Settings', icon: Key },
                            { id: 'data', label: 'Data', icon: Database },
                            { id: 'family', label: 'Family', icon: Users },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => updateView(item.id)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === item.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => updateView('billing')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${tier === 'free' ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/10' :
                                tier === 'pro' ? 'border-amber-500 text-amber-500 bg-amber-500/5 cursor-default' :
                                    'border-primary-500 text-primary-400 bg-primary-500/5 cursor-default'
                                }`}
                        >
                            {tier !== 'free' ? <Crown size={14} /> : <Zap size={14} className="animate-pulse" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">{tier} Tier</span>
                        </button>

                        <button onClick={lock} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Lock Vault">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-5xl mx-auto px-8 py-16">
                <div className="mb-12 flex items-baseline justify-between border-b border-white/5 pb-8">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">{getViewTitle()}</h1>
                        <p className="text-slate-500 font-medium font-mono text-xs uppercase tracking-[0.3em]">Status: <span className="text-green-500">Authorized Session</span></p>
                    </div>
                    <div className="hidden sm:block">
                        <StatusPanel compact />
                    </div>
                </div>

                <div className="animate-fade-in">
                    <VaultProvider>
                        {renderView()}
                    </VaultProvider>
                </div>
            </main>

            <footer className="max-w-5xl mx-auto px-8 py-12 border-t border-white/5 flex items-center justify-between text-slate-600 font-bold text-[9px] uppercase tracking-[0.4em]">
                <div>Zk Vault • Zero-Knowledge Core v1.0</div>
                <div className="flex gap-6">
                    <span className="hover:text-white transition-colors cursor-pointer">Security Protocol</span>
                    <span className="hover:text-white transition-colors cursor-pointer">Export Keys</span>
                </div>
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <OptionsContent />
        </AuthProvider>
    </React.StrictMode>
);
