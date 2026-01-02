import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Download, Upload, Trash2, AlertTriangle, Shield, CheckCircle, Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider, useVault } from './context/VaultContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { auditVault, type AuditResult } from './utils/passwordAudit';
import { StatusPanel } from './components/StatusPanel';
import { createEncryptedBackup, restoreFromEncryptedBackup } from './utils/backup';

const SecurityAudit: React.FC = () => {
    const { records } = useVault();
    const [audit, setAudit] = useState<AuditResult | null>(null);

    React.useEffect(() => {
        if (records.length > 0) {
            setAudit(auditVault(records));
        }
    }, [records]);

    if (!audit || records.length === 0) return null;

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-400';
        if (score >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="text-primary-400" size={24} />
                <h2 className="text-2xl font-semibold text-white">Security Audit</h2>
            </div>

            <div className="flex items-center justify-between mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                <div>
                    <h3 className="text-lg font-medium text-slate-200">Vault Health Score</h3>
                    <p className="text-sm text-slate-400">Based on password strength and reuse</p>
                </div>
                <div className={`text-5xl font-bold ${getScoreColor(audit.score)}`}>
                    {audit.score}
                </div>
            </div>

            <div className="space-y-6">
                {audit.reusedPasswords.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-yellow-400 font-medium">
                            <AlertTriangle size={18} />
                            Reused Passwords ({audit.reusedPasswords.length})
                        </h4>
                        <div className="space-y-2">
                            {audit.reusedPasswords.map((item, idx) => (
                                <div key={idx} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-slate-300">
                                    {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.weakPasswords.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-2 text-red-400 font-medium">
                            <AlertTriangle size={18} />
                            Weak Passwords ({audit.weakPasswords.length})
                        </h4>
                        <div className="space-y-2">
                            {audit.weakPasswords.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
                                    <span className="text-slate-200 font-medium">{item.title}</span>
                                    <span className="text-red-300 text-xs">{item.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {audit.weakPasswords.length === 0 && audit.reusedPasswords.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-green-400">
                        <CheckCircle size={48} className="mb-2 opacity-50" />
                        <p className="font-medium">All clear! Your vault is secure.</p>
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

        if (newPassword.length < 8) {
            setMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }

        setLoading(true);
        setMsg({ type: '', text: '' });

        const success = await changeMasterPassword(oldPassword, newPassword);

        setLoading(false);
        if (success) {
            setMsg({ type: 'success', text: 'Master password updated successfully and vault re-encrypted.' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setMsg({ type: 'error', text: 'Failed to update password. Please check your current password.' });
        }

        setTimeout(() => setMsg({ type: '', text: '' }), 5000);
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
                <Lock className="text-primary-400" size={24} />
                <h2 className="text-2xl font-semibold text-white">Security Settings</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Current Master Password</label>
                    <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="input-glass w-full"
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">New Master Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-glass w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-glass w-full"
                            required
                        />
                    </div>
                </div>

                {msg.text && (
                    <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {msg.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full md:w-auto"
                >
                    {loading ? 'Re-encrypting Vault...' : 'Change Master Password'}
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
    const [statusMsg, setStatusMsg] = useState('');

    const handleExport = () => {
        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `zk-vault-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMsg('Vault exported successfully.');
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const handleEncryptedExport = async () => {
        const password = prompt('Enter a password to encrypt this backup. You will need this password to restore the data.');
        if (!password) return;

        try {
            setImporting(true);
            const backup = await createEncryptedBackup(records, password);
            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `zk-vault-encrypted-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setStatusMsg('Secure encrypted backup created successfully.');
        } catch (error: any) {
            setStatusMsg(`Backup failed: ${error.message}`);
        } finally {
            setImporting(false);
            setTimeout(() => setStatusMsg(''), 5000);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) return [];

        const parseLine = (line: string) => {
            const values = [];
            let inQuote = false;
            let val = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    values.push(val.trim());
                    val = '';
                } else {
                    val += char;
                }
            }
            values.push(val.trim());
            return values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
        };

        const headers = parseLine(lines[0].toLowerCase());
        const maps: Record<string, number> = {};

        headers.forEach((h, i) => {
            if (h.includes('title') || h.includes('name') || h.includes('site')) maps.title = i;
            if (h.includes('url') || h.includes('link') || h.includes('web')) maps.url = i;
            if (h.includes('user') || h.includes('login') || h.includes('email')) maps.username = i;
            if (h.includes('pass') || h.includes('pwd')) maps.password = i;
            if (h.includes('note')) maps.notes = i;
        });

        if (maps.title === undefined && maps.url !== undefined) maps.title = maps.url;

        const results = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = parseLine(lines[i]);
            if (cols.length < 2) continue;

            const record: any = {
                type: 'login',
                title: maps.title !== undefined ? cols[maps.title] : (maps.url !== undefined ? new URL(cols[maps.url]).hostname : 'Imported'),
                username: maps.username !== undefined ? cols[maps.username] : '',
                password: maps.password !== undefined ? cols[maps.password] : '',
                url: maps.url !== undefined ? cols[maps.url] : '',
                notes: maps.notes !== undefined ? cols[maps.notes] : ''
            };

            if (record.password && (record.title || record.username)) {
                results.push(record);
            }
        }
        return results;
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setStatusMsg('Importing...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                let importedRecords: any[] = [];

                if (file.name.endsWith('.json')) {
                    try {
                        const data = JSON.parse(content);
                        if (data.ciphertext && data.salt && data.iv) {
                            const password = prompt('Enter the password used to encrypt this backup:');
                            if (!password) {
                                setImporting(false);
                                setStatusMsg('Restore cancelled.');
                                return;
                            }
                            importedRecords = await restoreFromEncryptedBackup(data, password);
                        } else {
                            importedRecords = data;
                        }
                    } catch (parseError) {
                        throw new Error('Invalid JSON file or incorrect backup password');
                    }
                } else if (file.name.endsWith('.csv')) {
                    importedRecords = parseCSV(content);
                } else {
                    throw new Error('Unsupported file type');
                }

                if (!Array.isArray(importedRecords)) {
                    throw new Error('Import data must be an array of records');
                }

                const recordsToAdd = importedRecords.map(item => ({
                    type: item.type || 'login',
                    title: item.title || item.url || 'Untitled',
                    username: item.username || '',
                    password: item.password || '',
                    url: item.url || '',
                    content: item.content || '',
                    notes: item.notes || '',
                    ...item
                }));

                if (recordsToAdd.length > 0) {
                    await addRecords(recordsToAdd);
                    setStatusMsg(`Successfully imported ${recordsToAdd.length} records.`);
                } else {
                    setStatusMsg('No valid records found to import.');
                }
            } catch (error: any) {
                setStatusMsg(`Import failed: ${error.message}`);
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setTimeout(() => setStatusMsg(''), 5000);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Download className="text-primary-400" size={24} />
                    <h2 className="text-2xl font-semibold text-white">Data Management</h2>
                </div>

                {statusMsg && (
                    <div className="mb-4 p-3 rounded-lg bg-primary-500/20 text-primary-200 text-sm border border-primary-500/30">
                        {statusMsg}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium text-slate-200 mb-2">Export Vault</h3>
                        <p className="text-sm text-slate-400 mb-3">
                            Keep your data safe with scheduled encrypted backups.
                        </p>
                        <div className="flex flex-col md:flex-row gap-3">
                            <button
                                onClick={handleEncryptedExport}
                                className="btn-primary flex items-center justify-center gap-2"
                                disabled={vaultLoading || importing}
                            >
                                <Lock size={18} />
                                Encrypted Backup (Secure)
                            </button>
                            <button
                                onClick={handleExport}
                                className="btn-secondary flex items-center justify-center gap-2"
                                disabled={vaultLoading || importing}
                            >
                                <Download size={18} />
                                Export JSON (Plaintext)
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-4">
                        <h3 className="text-lg font-medium text-slate-200 mb-2">Import & Restore</h3>
                        <p className="text-sm text-slate-400 mb-3">
                            Restore from a Zk Vault backup or import from generic files.
                        </p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.csv" className="hidden" />
                        <button
                            onClick={handleImportClick}
                            className="btn-secondary flex items-center gap-2"
                            disabled={importing || vaultLoading}
                        >
                            <Upload size={18} />
                            {importing ? 'Processing...' : 'Import / Restore Data'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-red-400" size={24} />
                    <h2 className="text-2xl font-semibold text-red-400">Danger Zone</h2>
                </div>
                <button
                    className="btn-danger flex items-center gap-2"
                    onClick={() => {
                        if (confirm('WARNING: Permanently delete ALL data?')) {
                            chrome.storage.local.clear(() => chrome.runtime.reload());
                        }
                    }}
                >
                    <Trash2 size={18} />
                    Clear Vault
                </button>
            </div>

            <div className="mt-8 flex gap-4">
                <button onClick={lock} className="btn-secondary flex-1">Logout</button>
                <button
                    onClick={() => {
                        lock();
                        chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
                    }}
                    className="btn-danger flex-1 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                >
                    Panic Lock (Immediate)
                </button>
            </div>
        </div>
    );
};

const OptionsContent: React.FC = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
    );

    if (!isAuthenticated) return (
        <div className="max-w-md mx-auto mt-20">
            <LoginScreen />
        </div>
    );

    return (
        <div className="min-h-screen w-full p-8 pb-20">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <img src="/icons/icon128.png" className="w-16 h-16 drop-shadow-lg" alt="Logo" />
                    <div>
                        <h1 className="text-4xl font-bold text-gradient">Zk Vault Settings</h1>
                        <p className="text-slate-400">Manage your secure storage</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-3">
                        <VaultProvider>
                            <div className="space-y-8">
                                <StatusPanel />
                                <SecurityAudit />
                                <SecuritySettings />
                                <DataManagement />
                            </div>
                        </VaultProvider>
                    </div>
                </div>
            </div>
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
