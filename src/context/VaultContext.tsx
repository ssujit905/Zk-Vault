import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { VaultRecord, EncryptedVaultRecord } from '../types';
import { storageService } from '../services/storage';
import { cryptoService } from '../services/crypto';
import { useAuth } from './AuthContext';

interface VaultContextType {
    records: VaultRecord[];
    loading: boolean;
    addRecord: (record: Omit<VaultRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    addRecords: (records: Omit<VaultRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
    updateRecord: (id: string, updates: Partial<Omit<VaultRecord, 'id' | 'createdAt'>>) => Promise<void>;
    deleteRecord: (id: string) => Promise<void>;
    searchRecords: (query: string) => Promise<VaultRecord[]>;
    refreshRecords: () => Promise<void>;
    recentActivity: { type: string; title: string; timestamp: number }[];
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [records, setRecords] = useState<VaultRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [recentActivity, setRecentActivity] = useState<{ type: string; title: string; timestamp: number }[]>([]);
    const { isAuthenticated, masterKey } = useAuth();

    const decryptRecords = async (encryptedRecords: EncryptedVaultRecord[]): Promise<VaultRecord[]> => {
        if (!masterKey) return [];

        const decrypted: VaultRecord[] = [];
        for (const record of encryptedRecords) {
            try {
                const jsonStr = await cryptoService.decrypt(
                    record.encryptedData.ciphertext,
                    record.encryptedData.iv,
                    masterKey
                );
                const data = JSON.parse(jsonStr);

                // Ensure type exists for old records
                if (!data.type) data.type = 'login';

                decrypted.push({
                    id: record.id,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt,
                    ...data
                } as VaultRecord);
            } catch (e) {
                console.error(`Failed to decrypt record ${record.id}`, e);
            }
        }
        return decrypted;
    };

    const loadRecords = async () => {
        if (!isAuthenticated || !masterKey) {
            setRecords([]);
            return;
        }

        try {
            setLoading(true);
            const vaultData = await storageService.loadVaultData();
            if (vaultData && vaultData.records) {
                const decrypted = await decryptRecords(vaultData.records);
                setRecords(decrypted);
            }
        } catch (error) {
            console.error('Failed to load records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, [isAuthenticated, masterKey]);

    const saveToStorage = async (newRecords: VaultRecord[]) => {
        if (!masterKey) throw new Error('Vault is locked');

        const vaultData = await storageService.loadVaultData();
        if (!vaultData) throw new Error('Vault data missing');

        const encryptedRecords: EncryptedVaultRecord[] = [];

        for (const record of newRecords) {
            const { id, createdAt, updatedAt, ...rest } = record;
            const jsonStr = JSON.stringify(rest);
            const encryptedData = await cryptoService.encrypt(jsonStr, masterKey);

            encryptedRecords.push({
                id,
                createdAt,
                updatedAt,
                encryptedData,
            });
        }

        vaultData.records = encryptedRecords;
        await storageService.saveVaultData(vaultData);
    };

    const addRecord = async (record: Omit<VaultRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
        await addRecords([record]);
    };

    const addRecords = async (newRecordsData: Omit<VaultRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => {
        const now = Date.now();
        const recordsToAdd: VaultRecord[] = newRecordsData.map(r => ({
            ...r,
            id: (crypto as any).randomUUID(),
            createdAt: now,
            updatedAt: now,
        } as VaultRecord));

        const updatedRecords = [...records, ...recordsToAdd];
        setRecords(updatedRecords);

        // Log activity
        const newActivities = recordsToAdd.map(r => ({ type: 'ADD', title: r.title, timestamp: now }));
        setRecentActivity(prev => [...newActivities, ...prev].slice(0, 10));

        await saveToStorage(updatedRecords);
    };

    const updateRecord = async (id: string, updates: Partial<Omit<VaultRecord, 'id' | 'createdAt'>>) => {
        const target = records.find(r => r.id === id);
        const updatedRecords = records.map((r: VaultRecord) => {
            if (r.id === id) {
                return { ...r, ...updates, updatedAt: Date.now() } as VaultRecord;
            }
            return r;
        });

        if (target) {
            setRecentActivity(prev => [{ type: 'UPDATE', title: target.title, timestamp: Date.now() }, ...prev].slice(0, 10));
        }

        setRecords(updatedRecords);
        await saveToStorage(updatedRecords);
    };

    const deleteRecord = async (id: string) => {
        const target = records.find(r => r.id === id);
        const updatedRecords = records.filter((r: VaultRecord) => r.id !== id);

        if (target) {
            setRecentActivity(prev => [{ type: 'DELETE', title: target.title, timestamp: Date.now() }, ...prev].slice(0, 10));
        }

        setRecords(updatedRecords);
        await saveToStorage(updatedRecords);
    };

    const searchRecords = async (query: string) => {
        const lowerQuery = query.toLowerCase();
        return records.filter((record: VaultRecord) => {
            const inTitle = record.title.toLowerCase().includes(lowerQuery);
            const inNotes = record.notes?.toLowerCase().includes(lowerQuery);

            let inTypeSpecific = false;
            if (record.type === 'login') {
                inTypeSpecific = (record as any).username?.toLowerCase().includes(lowerQuery) ||
                    (record as any).url?.toLowerCase().includes(lowerQuery);
            } else if (record.type === 'identity') {
                inTypeSpecific = (record as any).email?.toLowerCase().includes(lowerQuery) ||
                    (record as any).firstName?.toLowerCase().includes(lowerQuery) ||
                    (record as any).lastName?.toLowerCase().includes(lowerQuery);
            } else if (record.type === 'card') {
                inTypeSpecific = (record as any).cardholderName?.toLowerCase().includes(lowerQuery) ||
                    (record as any).brand?.toLowerCase().includes(lowerQuery);
            } else if (record.type === 'note') {
                inTypeSpecific = (record as any).content?.toLowerCase().includes(lowerQuery);
            }

            return inTitle || inNotes || inTypeSpecific;
        });
    };

    const refreshRecords = async () => {
        await loadRecords();
    };

    return (
        <VaultContext.Provider
            value={{
                records,
                loading,
                addRecord,
                addRecords,
                updateRecord,
                deleteRecord,
                searchRecords,
                refreshRecords,
                recentActivity,
            }}
        >
            {children}
        </VaultContext.Provider>
    );
};

export const useVault = () => {
    const context = useContext(VaultContext);
    if (!context) {
        throw new Error('useVault must be used within a VaultProvider');
    }
    return context;
};
