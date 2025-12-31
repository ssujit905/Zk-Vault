import React, { useState } from 'react';
import { Copy, Eye, EyeOff, Edit2, Trash2, ExternalLink, Check } from 'lucide-react';
import type { PasswordRecord } from '../types';

interface PasswordCardProps {
    record: PasswordRecord;
    onEdit: (record: PasswordRecord) => void;
    onDelete: (id: string) => void;
}

export const PasswordCard: React.FC<PasswordCardProps> = ({ record, onEdit, onDelete }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState<'username' | 'password' | null>(null);

    const copyToClipboard = async (text: string, type: 'username' | 'password') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);

            if (type === 'password') {
                chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
            }
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const openUrl = () => {
        if (record.url) {
            window.open(record.url.startsWith('http') ? record.url : `https://${record.url}`, '_blank');
        }
    };

    return (
        <div className="glass-card-hover p-4 animate-slide-up">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{record.title}</h3>
                    {record.url && (
                        <button
                            onClick={openUrl}
                            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                        >
                            {record.url}
                            <ExternalLink size={12} />
                        </button>
                    )}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onEdit(record)}
                        className="btn-icon"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(record.id)}
                        className="btn-icon hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {/* Username */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300">
                        {record.username}
                    </div>
                    <button
                        onClick={() => copyToClipboard(record.username, 'username')}
                        className="btn-icon"
                        title="Copy username"
                    >
                        {copied === 'username' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>

                {/* Password */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono">
                        {showPassword ? record.password : '••••••••••••'}
                    </div>
                    <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="btn-icon"
                        title={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                        onClick={() => copyToClipboard(record.password, 'password')}
                        className="btn-icon"
                        title="Copy password"
                    >
                        {copied === 'password' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>

                {/* Notes */}
                {record.notes && (
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-400">
                        {record.notes}
                    </div>
                )}
            </div>

            <div className="mt-3 text-xs text-slate-500">
                Updated {new Date(record.updatedAt).toLocaleDateString()}
            </div>
        </div>
    );
};
