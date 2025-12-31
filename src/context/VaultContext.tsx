import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PasswordRecord, EncryptedPasswordRecord } from '../types';
import { storageService } from '../services/storage';
import { cryptoService } from '../services/crypto';
import { useAuth } from './AuthContext';

interface VaultContextType {
    records: PasswordRecord[];
    loading: boolean;
    addRecord: (record: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    addRecords: (records: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
    updateRecord: (id: string, updates: Partial<Omit<PasswordRecord, 'id' | 'createdAt'>>) => Promise<void>;
    deleteRecord: (id: string) => Promise<void>;
    searchRecords: (query: string) => Promise<PasswordRecord[]>;
    refreshRecords: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [records, setRecords] = useState<PasswordRecord[]>([]);
    const [loading, setLoading] = useState(false); // Changed default to false, loaded via auth
    const { isAuthenticated, masterKey } = useAuth();

    const decryptRecords = async (encryptedRecords: EncryptedPasswordRecord[]): Promise<PasswordRecord[]> => {
        if (!masterKey) return [];

        const decrypted: PasswordRecord[] = [];
        for (const record of encryptedRecords) {
            try {
                const jsonStr = await cryptoService.decrypt(
                    record.encryptedData.ciphertext,
                    record.encryptedData.iv,
                    masterKey
                );
                const data = JSON.parse(jsonStr);
                decrypted.push({
                    id: record.id,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt,
                    ...data
                });
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

    const saveToStorage = async (newRecords: PasswordRecord[]) => {
        if (!masterKey) throw new Error('Vault is locked');

        const vaultData = await storageService.loadVaultData();
        if (!vaultData) throw new Error('Vault data missing');

        const encryptedRecords: EncryptedPasswordRecord[] = [];

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

    const addRecord = async (record: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
        await addRecords([record]);
    };

    const addRecords = async (newRecordsData: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => {
        const now = Date.now();
        const recordsToAdd: PasswordRecord[] = newRecordsData.map(r => ({
            ...r,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }));

        const updatedRecords = [...records, ...recordsToAdd];
        setRecords(updatedRecords);
        await saveToStorage(updatedRecords);
    };

    const updateRecord = async (id: string, updates: Partial<Omit<PasswordRecord, 'id' | 'createdAt'>>) => {
        const updatedRecords = records.map(r => {
            if (r.id === id) {
                return { ...r, ...updates, updatedAt: Date.now() };
            }
            return r;
        });

        setRecords(updatedRecords);
        await saveToStorage(updatedRecords);
    };

    const deleteRecord = async (id: string) => {
        const updatedRecords = records.filter(r => r.id !== id);
        setRecords(updatedRecords);
        await saveToStorage(updatedRecords);
    };

    const searchRecords = async (query: string) => {
        const lowerQuery = query.toLowerCase();
        return records.filter(record =>
            record.title.toLowerCase().includes(lowerQuery) ||
            record.username.toLowerCase().includes(lowerQuery) ||
            record.url?.toLowerCase().includes(lowerQuery)
        );
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
