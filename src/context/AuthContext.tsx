import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { cryptoService } from '../services/crypto';
import { storageService } from '../services/storage';
import type { VaultData, UserTier } from '../types';

interface AuthContextType {
    isAuthenticated: boolean;
    hasVault: boolean;
    loading: boolean;
    tier: UserTier;
    setTier: (tier: UserTier) => Promise<void>;
    lock: () => void;
    unlock: (password: string) => Promise<boolean>;
    setupVault: (password: string) => Promise<void>;
    changeMasterPassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    masterKey: CryptoKey | null;
    lastUnlockAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasVault, setHasVault] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tier, setTierState] = useState<UserTier>('free');
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [lastUnlockAt, setLastUnlockAt] = useState<number | null>(null);

    useEffect(() => {
        const init = async () => {
            await checkVaultStatus();
            const currentTier = await storageService.getTier();
            setTierState(currentTier);
        };
        init();

        const handleMessage = (message: any) => {
            if (message.type === 'VAULT_LOCKED_MSG') {
                setIsAuthenticated(false);
                setMasterKey(null);
                setLastUnlockAt(null);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

    const checkVaultStatus = async () => {
        try {
            const exists = await storageService.hasVault();
            setHasVault(exists);
        } catch (error) {
            console.error('Failed to check vault status:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateTier = async (newTier: UserTier) => {
        await storageService.setTier(newTier);
        setTierState(newTier);
    };

    const unlock = async (password: string): Promise<boolean> => {
        try {
            const vaultData = await storageService.loadVaultData();
            if (!vaultData || !vaultData.security) {
                throw new Error('Vault data corrupted or missing');
            }

            const saltStr = atob(vaultData.security.salt);
            const salt = new Uint8Array(saltStr.length);
            for (let i = 0; i < saltStr.length; i++) {
                salt[i] = saltStr.charCodeAt(i);
            }
            const key = await cryptoService.deriveKey(password, salt);
            const validation = vaultData.security.validation;
            const decryptedValidation = await cryptoService.decrypt(
                validation.ciphertext,
                validation.iv,
                key
            );

            if (decryptedValidation === 'VALID') {
                const exportedKey = await crypto.subtle.exportKey('jwk', key);
                await chrome.storage.session.set({ masterKey: exportedKey });

                setMasterKey(key);
                setLastUnlockAt(Date.now());
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Unlock failed:', error);
            return false;
        }
    };

    const setupVault = async (password: string) => {
        try {
            const salt = cryptoService.generateSalt();
            const saltString = btoa(String.fromCharCode(...salt));
            const key = await cryptoService.deriveKey(password, salt);
            const validation = await cryptoService.encrypt('VALID', key);

            const initialVaultData: VaultData = {
                version: '1.0.0',
                security: {
                    salt: saltString,
                    validation: validation,
                },
                records: [],
            };

            await storageService.saveVaultData(initialVaultData);

            const exportedKey = await crypto.subtle.exportKey('jwk', key);
            await chrome.storage.session.set({ masterKey: exportedKey });

            setMasterKey(key);
            setLastUnlockAt(Date.now());
            setHasVault(true);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    };

    const changeMasterPassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        try {
            const vaultData = await storageService.loadVaultData();
            if (!vaultData || !vaultData.security) return false;

            const saltStr = atob(vaultData.security.salt);
            const oldSalt = new Uint8Array(saltStr.length);
            for (let i = 0; i < saltStr.length; i++) {
                oldSalt[i] = saltStr.charCodeAt(i);
            }
            const oldKey = await cryptoService.deriveKey(oldPassword, oldSalt);

            const validation = vaultData.security.validation;
            const decryptedValidation = await cryptoService.decrypt(
                validation.ciphertext,
                validation.iv,
                oldKey
            );

            if (decryptedValidation !== 'VALID') return false;

            const newSalt = cryptoService.generateSalt();
            const newSaltString = btoa(String.fromCharCode(...newSalt));
            const newKey = await cryptoService.deriveKey(newPassword, newSalt);

            const reEncryptedRecords = await Promise.all(vaultData.records.map(async (record) => {
                const decryptedData = await cryptoService.decrypt(
                    record.encryptedData.ciphertext,
                    record.encryptedData.iv,
                    oldKey
                );
                const newEncryptedData = await cryptoService.encrypt(decryptedData, newKey);
                return {
                    ...record,
                    encryptedData: newEncryptedData,
                    updatedAt: Date.now()
                };
            }));

            const newValidation = await cryptoService.encrypt('VALID', newKey);

            const updatedVaultData: VaultData = {
                ...vaultData,
                security: {
                    salt: newSaltString,
                    validation: newValidation,
                },
                records: reEncryptedRecords,
                version: vaultData.version
            };

            await storageService.saveVaultData(updatedVaultData);

            const exportedKey = await crypto.subtle.exportKey('jwk', newKey);
            await chrome.storage.session.set({ masterKey: exportedKey });
            setMasterKey(newKey);

            return true;
        } catch (error) {
            console.error('Failed to change master password:', error);
            return false;
        }
    };

    const lock = () => {
        chrome.storage.session.remove('masterKey');
        setMasterKey(null);
        setLastUnlockAt(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                hasVault,
                loading,
                tier,
                setTier: updateTier,
                lock,
                unlock,
                setupVault,
                changeMasterPassword,
                masterKey,
                lastUnlockAt,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
