import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { cryptoService } from '../services/crypto';
import { storageService } from '../services/storage';
import type { VaultData } from '../types';

interface AuthContextType {
    isAuthenticated: boolean;
    hasVault: boolean;
    loading: boolean;
    lock: () => void;
    unlock: (password: string) => Promise<boolean>;
    setupVault: (password: string) => Promise<void>;
    changeMasterPassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    masterKey: CryptoKey | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasVault, setHasVault] = useState(false);
    const [loading, setLoading] = useState(true);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

    useEffect(() => {
        checkVaultStatus();

        const handleMessage = (message: any) => {
            if (message.type === 'VAULT_LOCKED_MSG') {
                setIsAuthenticated(false);
                setMasterKey(null);
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

    const unlock = async (password: string): Promise<boolean> => {
        try {
            const vaultData = await storageService.loadVaultData();
            if (!vaultData || !vaultData.security) {
                throw new Error('Vault data corrupted or missing');
            }

            // 1. Decode salt
            const salt = Uint8Array.from(atob(vaultData.security.salt), c => c.charCodeAt(0));

            // 2. Derive key
            const key = await cryptoService.deriveKey(password, salt);

            // 3. Verify key by decrypting validation string
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
            // 1. Generate salt
            const salt = cryptoService.generateSalt();
            const saltString = btoa(String.fromCharCode(...salt));

            // 2. Derive key
            const key = await cryptoService.deriveKey(password, salt);

            // 3. Create validation string
            const validation = await cryptoService.encrypt('VALID', key);

            // 4. Create initial vault data
            const initialVaultData: VaultData = {
                version: '1.0.0',
                security: {
                    salt: saltString,
                    validation: validation,
                },
                records: [],
            };

            // 5. Save to storage
            await storageService.saveVaultData(initialVaultData);

            const exportedKey = await crypto.subtle.exportKey('jwk', key);
            await chrome.storage.session.set({ masterKey: exportedKey });

            setMasterKey(key);
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

            // 1. Verify old password
            const oldSalt = Uint8Array.from(atob(vaultData.security.salt), c => c.charCodeAt(0));
            const oldKey = await cryptoService.deriveKey(oldPassword, oldSalt);

            const validation = vaultData.security.validation;
            const decryptedValidation = await cryptoService.decrypt(
                validation.ciphertext,
                validation.iv,
                oldKey
            );

            if (decryptedValidation !== 'VALID') {
                return false;
            }

            // 2. Derive new key
            const newSalt = cryptoService.generateSalt();
            const newSaltString = btoa(String.fromCharCode(...newSalt));
            const newKey = await cryptoService.deriveKey(newPassword, newSalt);

            // 3. Re-encrypt all records
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

            // 4. Create new validation
            const newValidation = await cryptoService.encrypt('VALID', newKey);

            // 5. Save everything
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

            // 6. Update session
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
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                hasVault,
                loading,
                lock,
                unlock,
                setupVault,
                changeMasterPassword,
                masterKey,
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
