import React, { useState } from 'react';
import { Copy, Eye, EyeOff, Edit2, Trash2, ExternalLink, Check, Lock, FileText, User, CreditCard } from 'lucide-react';
import type { VaultRecord } from '../types';

interface VaultItemCardProps {
    record: VaultRecord;
    onEdit: (record: VaultRecord) => void;
    onDelete: (id: string) => void;
}

export const VaultItemCard: React.FC<VaultItemCardProps> = ({ record, onEdit, onDelete }) => {
    const [showSensitive, setShowSensitive] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);

            if (label === 'password' || label === 'cardNumber' || label === 'cvv') {
                chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
            }
        } catch (error) {
            console.warn('Clipboard copy permission denied');
        }
    };

    const getTypeIcon = () => {
        if (record.customIcon) {
            const domains: Record<string, string> = {
                google: 'google.com',
                facebook: 'facebook.com',
                apple: 'apple.com',
                github: 'github.com',
                netflix: 'netflix.com',
                amazon: 'amazon.com',
                twitter: 'twitter.com',
                microsoft: 'microsoft.com'
            };
            const domain = domains[record.customIcon];
            if (domain) {
                return (
                    <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
                        alt={record.customIcon}
                        className="w-[18px] h-[18px] rounded shadow-sm"
                    />
                );
            }
        }

        switch (record.type) {
            case 'login': return <Lock size={18} className="text-primary-400" />;
            case 'note': return <FileText size={18} className="text-yellow-400" />;
            case 'identity': return <User size={18} className="text-green-400" />;
            case 'card': return <CreditCard size={18} className="text-purple-400" />;
            default: return <Lock size={18} className="text-slate-400" />;
        }
    };

    const renderContent = () => {
        switch (record.type) {
            case 'login':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 truncate">
                                {record.username}
                            </div>
                            <button onClick={() => copyToClipboard(record.username, 'username')} className="btn-icon">
                                {copied === 'username' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono truncate">
                                {showSensitive ? record.password : '••••••••••••'}
                            </div>
                            <button onClick={() => setShowSensitive(!showSensitive)} className="btn-icon">
                                {showSensitive ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button onClick={() => copyToClipboard(record.password, 'password')} className="btn-icon">
                                {copied === 'password' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                );
            case 'note':
                return (
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {record.content}
                    </div>
                );
            case 'identity':
                return (
                    <div className="space-y-2">
                        <div className="bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300">
                            {record.firstName} {record.lastName}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 truncate">
                                {record.email}
                            </div>
                            <button onClick={() => copyToClipboard(record.email, 'email')} className="btn-icon">
                                {copied === 'email' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                );
            case 'card':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono">
                                {showSensitive ? record.cardNumber : `•••• •••• •••• ${record.cardNumber.slice(-4)}`}
                            </div>
                            <button onClick={() => setShowSensitive(!showSensitive)} className="btn-icon">
                                {showSensitive ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button onClick={() => copyToClipboard(record.cardNumber, 'cardNumber')} className="btn-icon">
                                {copied === 'cardNumber' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-400">
                                Exp: {record.expiryDate}
                            </div>
                            <div className="flex gap-1 items-center bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-400">
                                CVV: {showSensitive ? record.cvv : '•••'}
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="glass-card-hover p-4 animate-slide-up">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg transition-all min-w-[34px] flex items-center justify-center">
                        {getTypeIcon()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white truncate max-w-[120px]">{record.title}</h3>
                        </div>
                        {record.type === 'login' && record.url && (
                            <button
                                onClick={() => window.open(record.url?.startsWith('http') ? record.url : `https://${record.url}`, '_blank')}
                                className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors mt-0.5"
                            >
                                {record.url}
                                <ExternalLink size={10} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => onEdit(record)} className="btn-icon" title="Edit">
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(record.id)}
                        className="btn-icon hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {renderContent()}

            {record.notes && record.type !== 'note' && (
                <div className="mt-2 bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-400 truncate">
                    {record.notes}
                </div>
            )}

            <div className="mt-3 text-[10px] text-slate-600 flex justify-between items-center bg-white/[0.02] -mx-4 -mb-4 px-4 py-2 rounded-b-xl border-t border-white/5">
                <span className="font-black uppercase tracking-[0.1em]">{record.type}</span>
                <span>Updated {new Date(record.updatedAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
};
