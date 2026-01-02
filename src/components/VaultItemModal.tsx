import React, { useState, useEffect } from 'react';
import { X, Wand2, Lock, FileText, User, CreditCard } from 'lucide-react';
import type { VaultRecord, VaultItemType } from '../types';
import { PasswordGenerator } from './PasswordGenerator';

interface VaultItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: any) => Promise<void>;
    editRecord?: VaultRecord | null;
}

export const VaultItemModal: React.FC<VaultItemModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editRecord,
}) => {
    const [type, setType] = useState<VaultItemType>('login');
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);

    useEffect(() => {
        if (editRecord) {
            setType(editRecord.type);
            setFormData(editRecord);
        } else {
            setType('login');
            setFormData({
                type: 'login',
                title: '',
                username: '',
                password: '',
                url: '',
                notes: '',
            });
        }
        setShowGenerator(false);
    }, [editRecord, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({ ...formData, type });
            onClose();
        } catch (error) {
            console.error('Failed to save record:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleTypeChange = (newType: VaultItemType) => {
        setType(newType);
        // Initialize default fields for new type if not editing
        if (!editRecord) {
            const defaults: any = { type: newType, title: formData.title || '' };
            if (newType === 'login') {
                defaults.username = '';
                defaults.password = '';
                defaults.url = '';
            } else if (newType === 'note') {
                defaults.content = '';
            } else if (newType === 'identity') {
                defaults.firstName = '';
                defaults.lastName = '';
                defaults.email = '';
                defaults.phone = '';
            } else if (newType === 'card') {
                defaults.cardholderName = '';
                defaults.cardNumber = '';
                defaults.expiryDate = '';
                defaults.cvv = '';
                defaults.brand = '';
            }
            setFormData(defaults);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="glass-card w-full max-w-md p-6 animate-slide-up my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {editRecord ? 'Edit Item' : 'Add Item'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                {/* Type Selector */}
                {!editRecord && (
                    <div className="flex gap-2 mb-6">
                        {[
                            { id: 'login', icon: Lock, label: 'Login' },
                            { id: 'note', icon: FileText, label: 'Note' },
                            { id: 'identity', icon: User, label: 'ID' },
                            { id: 'card', icon: CreditCard, label: 'Card' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTypeChange(t.id as VaultItemType)}
                                className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${type === t.id
                                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                <t.icon size={18} />
                                <span className="text-[10px] uppercase font-bold">{t.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                        <input
                            type="text"
                            required
                            value={formData.title || ''}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input-glass"
                            placeholder="Set a name..."
                        />
                    </div>

                    {type === 'login' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.username || ''}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="input-glass"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-300">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowGenerator(!showGenerator)}
                                        className="text-xs text-primary-400 hover:text-primary-300"
                                    >
                                        <Wand2 size={12} className="inline mr-1" />
                                        {showGenerator ? 'Hide' : 'Generate'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={formData.password || ''}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input-glass font-mono"
                                />
                                {showGenerator && (
                                    <PasswordGenerator onSelect={(pwd) => setFormData({ ...formData, password: pwd })} />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">URL</label>
                                <input
                                    type="text"
                                    value={formData.url || ''}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="input-glass"
                                />
                            </div>
                        </>
                    )}

                    {type === 'note' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Content *</label>
                            <textarea
                                required
                                value={formData.content || ''}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="input-glass resize-none"
                                rows={6}
                                placeholder="Secure note content..."
                            />
                        </div>
                    )}

                    {type === 'identity' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName || ''}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="input-glass"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName || ''}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="input-glass"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input-glass"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input-glass"
                                />
                            </div>
                        </>
                    )}

                    {type === 'card' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Cardholder Name</label>
                                <input
                                    type="text"
                                    value={formData.cardholderName || ''}
                                    onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
                                    className="input-glass"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Card Number</label>
                                <input
                                    type="text"
                                    value={formData.cardNumber || ''}
                                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                                    className="input-glass font-mono"
                                    placeholder="0000 0000 0000 0000"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Expiry Date</label>
                                    <input
                                        type="text"
                                        value={formData.expiryDate || ''}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        className="input-glass"
                                        placeholder="MM/YY"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">CVV</label>
                                    <input
                                        type="password"
                                        value={formData.cvv || ''}
                                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                                        className="input-glass font-mono"
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {(type !== 'note') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="input-glass resize-none"
                                rows={2}
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>Cancel</button>
                        <button type="submit" className="btn-primary flex-1" disabled={saving}>
                            {saving ? 'Saving...' : editRecord ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
