import React, { useState, useEffect } from 'react';
import { X, Wand2 } from 'lucide-react';
import type { PasswordRecord } from '../types';
import { PasswordGenerator } from './PasswordGenerator';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    editRecord?: PasswordRecord | null;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editRecord,
}) => {
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);

    useEffect(() => {
        if (editRecord) {
            setFormData({
                title: editRecord.title,
                username: editRecord.username,
                password: editRecord.password,
                url: editRecord.url || '',
                notes: editRecord.notes || '',
            });
            setShowGenerator(false);
        } else {
            setFormData({
                title: '',
                username: '',
                password: '',
                url: '',
                notes: '',
            });
            setShowGenerator(false);
        }
    }, [editRecord, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save record:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className={`glass-card w-full max-w-md p-6 animate-slide-up my-auto ${showGenerator ? 'max-h-[85vh] overflow-y-auto' : ''}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {editRecord ? 'Edit Credential' : 'Add Credential'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ... other fields ... */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input-glass"
                            placeholder="e.g., Gmail, GitHub"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Username *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="input-glass"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-300">
                                Password *
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowGenerator(!showGenerator)}
                                className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                <Wand2 size={12} />
                                {showGenerator ? 'Hide Generator' : 'Generate'}
                            </button>
                        </div>
                        <input
                            type="text" // using text to see the password, or handle show/hide. Usually in edit/add we want to see it or have toggle. Using text for now as standard for managers when editing.
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input-glass font-mono"
                            placeholder="••••••••"
                        />
                        {showGenerator && (
                            <PasswordGenerator
                                onSelect={(pwd) => {
                                    setFormData(prev => ({ ...prev, password: pwd }));
                                    // Optional: Hide generator after selection? No, user might want to regen.
                                }}
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            URL
                        </label>
                        <input
                            type="text"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="input-glass"
                            placeholder="https://example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input-glass resize-none"
                            rows={3}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : editRecord ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
