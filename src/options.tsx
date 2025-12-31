import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Settings, Lock, Download, Upload } from 'lucide-react';

const OptionsPage: React.FC = () => {
    return (
        <div className="min-h-screen w-full p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-500/30">
                            <Lock size={28} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gradient">Zk Vault Settings</h1>
                    </div>
                    <p className="text-slate-400 ml-16">Manage your vault settings and preferences</p>
                </div>

                {/* Settings Sections */}
                <div className="space-y-6">
                    {/* General Settings */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Settings className="text-primary-400" size={24} />
                            <h2 className="text-2xl font-semibold text-white">General Settings</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Auto-lock timeout (minutes)
                                </label>
                                <input
                                    type="number"
                                    className="input-glass max-w-xs"
                                    placeholder="15"
                                    min="1"
                                    max="120"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Automatically lock vault after period of inactivity
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Clipboard clear timeout (seconds)
                                </label>
                                <input
                                    type="number"
                                    className="input-glass max-w-xs"
                                    placeholder="30"
                                    min="5"
                                    max="300"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Automatically clear clipboard after copying password
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Download className="text-primary-400" size={24} />
                            <h2 className="text-2xl font-semibold text-white">Data Management</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-slate-200 mb-2">Export Vault</h3>
                                <p className="text-sm text-slate-400 mb-3">
                                    Download your vault data as JSON (Coming in Phase 3)
                                </p>
                                <button className="btn-secondary" disabled>
                                    <Download size={18} className="inline mr-2" />
                                    Export Data
                                </button>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-slate-200 mb-2">Import Vault</h3>
                                <p className="text-sm text-slate-400 mb-3">
                                    Import passwords from JSON or CSV (Coming in Phase 3)
                                </p>
                                <button className="btn-secondary" disabled>
                                    <Upload size={18} className="inline mr-2" />
                                    Import Data
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="glass-card p-6 border-red-500/20">
                        <h2 className="text-2xl font-semibold text-red-400 mb-4">Danger Zone</h2>
                        <div>
                            <h3 className="text-lg font-medium text-slate-200 mb-2">Clear All Data</h3>
                            <p className="text-sm text-slate-400 mb-3">
                                Permanently delete all passwords from your vault. This action cannot be undone.
                            </p>
                            <button className="btn-danger">
                                Clear Vault
                            </button>
                        </div>
                    </div>

                    {/* About */}
                    <div className="glass-card p-6">
                        <h2 className="text-2xl font-semibold text-white mb-4">About Zk Vault</h2>
                        <div className="space-y-2 text-sm text-slate-400">
                            <p><strong className="text-slate-300">Version:</strong> 1.0.0 (Phase 1 - MVP)</p>
                            <p><strong className="text-slate-300">Status:</strong> Foundation Complete</p>
                            <p className="pt-2 text-slate-500">
                                Zk Vault is a zero-knowledge password manager built with security and privacy in mind.
                                All data is stored locally on your device.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <OptionsPage />
    </React.StrictMode>
);
