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

            // Note: Since KEK is memory-only, we cannot reconstruct the PMK after a reload/refresh.
            // This is intended per the "Elite Tier" security plan.
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
            console.warn('Vault status check failed (usually non-critical)');
        } finally {
            setLoading(false);
        }
    };

    const updateTier = async (newTier: UserTier) => {
        await storageService.setTier(newTier);
        setTierState(newTier);
    };

    const wrapAndStoreKey = async (pmk: CryptoKey) => {
        try {
            // 1. Generate volatile Session KEK
            const kek = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // 2. Wrap PMK with S-KEK
            const pmkRaw = await crypto.subtle.exportKey('raw', pmk);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const sealedPmk = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                kek,
                pmkRaw
            );

            // 3. Store sealed package in session storage
            await chrome.storage.session.set({
                sealedPmk: cryptoService.arrayBufferToBase64(sealedPmk),
                pmkIv: cryptoService.uint8ArrayToBase64(iv)
            });

            // 4. Preserve PMK in React state
            setMasterKey(pmk);

            // 5. Transfer S-KEK to Service Worker memory (Handover)
            const kekJwk = await crypto.subtle.exportKey('jwk', kek);
            await chrome.runtime.sendMessage({
                type: 'SET_SESSION_KEK',
                kekJwk
            }).catch(() => { }); // SW might be busy
        } catch (e) {
            console.warn("Key wrapping failed:", e);
        }
    };

    const unlock = async (password: string): Promise<boolean> => {
        try {
            const vaultData = await storageService.loadVaultData();
            if (!vaultData || !vaultData.security) {
                throw new Error('Vault data corrupted or missing');
            }

            const saltBytes = atob(vaultData.security.salt);
            const salt = Uint8Array.from(saltBytes, c => c.charCodeAt(0));

            // Derive using stored KDF or default to legacy PBKDF2
            const key = await cryptoService.deriveKey(
                password.trim(),
                salt,
                (vaultData.security.kdf as any) || 'pbkdf2'
            );

            const validation = vaultData.security.validation;
            const decryptedValidation = await cryptoService.decrypt(
                validation.ciphertext,
                validation.iv,
                key
            );

            if (decryptedValidation.trim() === 'VALID') {
                await wrapAndStoreKey(key);
                setLastUnlockAt(Date.now());
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            // Log a simple string instead of the Error object to prevent Chrome from tracking stack traces as critical errors
            console.warn('Unlock attempt failed: Invalid password or proof.');
            return false;
        }
    };

    const setupVault = async (password: string) => {
        try {
            const salt = cryptoService.generateSalt();
            const saltString = btoa(String.fromCharCode(...salt));
            // Derive using primary Argon2id for new vaults
            const key = await cryptoService.deriveKey(password, salt, 'argon2id');
            const validation = await cryptoService.encrypt('VALID', key);

            const initialVaultData: VaultData = {
                version: '1.1.0',
                security: {
                    salt: saltString,
                    validation: validation,
                    kdf: 'argon2id'
                },
                records: [],
            };

            await storageService.saveVaultData(initialVaultData);

            await wrapAndStoreKey(key);
            setLastUnlockAt(Date.now());
            setHasVault(true);
            setIsAuthenticated(true);
        } catch (error) {
            console.warn('Vault setup failed');
            throw error;
        }
    };

    const changeMasterPassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        try {
            const vaultData = await storageService.loadVaultData();
            if (!vaultData || !vaultData.security) return false;

            const oldSaltStr = atob(vaultData.security.salt);
            const oldSalt = Uint8Array.from(oldSaltStr, c => c.charCodeAt(0));
            const oldKey = await cryptoService.deriveKey(
                oldPassword.trim(),
                oldSalt,
                (vaultData.security.kdf as any) || 'pbkdf2'
            );

            const validation = vaultData.security.validation;
            const decryptedValidation = await cryptoService.decrypt(
                validation.ciphertext,
                validation.iv,
                oldKey
            );

            if (decryptedValidation.trim() !== 'VALID') return false;

            const newSalt = cryptoService.generateSalt();
            const newSaltString = btoa(String.fromCharCode(...newSalt));

            // Always upgrade to Argon2id on password change
            const newKey = await cryptoService.deriveKey(newPassword, newSalt, 'argon2id');

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
                    kdf: 'argon2id'
                },
                records: reEncryptedRecords,
                version: '1.1.0'
            };

            await storageService.saveVaultData(updatedVaultData);

            await wrapAndStoreKey(newKey);
            return true;
        } catch (error) {
            console.warn('Master password change failed');
            return false;
        }
    };

    const lock = () => {
        chrome.storage.session.remove(['sealedPmk', 'pmkIv']);
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
