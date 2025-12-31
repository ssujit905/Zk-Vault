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
