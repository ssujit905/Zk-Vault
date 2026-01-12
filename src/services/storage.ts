import type { VaultData, StorageData, UserTier, FamilyMember, UserSettings } from '../types';

const STORAGE_KEY = 'zk_vault_data';

class StorageService {
    /**
     * Save full vault data to chrome.storage.local
     */
    async saveVaultData(vaultData: VaultData): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = (result[STORAGE_KEY] || {}) as StorageData;
                storageData.vault = vaultData;
                chrome.storage.local.set({ [STORAGE_KEY]: storageData }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
        });
    }

    /**
     * Load vault data from chrome.storage.local
     */
    async loadVaultData(): Promise<VaultData | null> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    const storageData = result[STORAGE_KEY] as StorageData | undefined;
                    resolve(storageData?.vault || null);
                }
            });
        });
    }

    /**
     * Check if a vault exists
     */
    async hasVault(): Promise<boolean> {
        const data = await this.loadVaultData();
        return !!data && !!data.security;
    }

    /**
     * Clear all vault data
     */
    async clearVault(): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove([STORAGE_KEY], () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    async getTier(): Promise<UserTier> {
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = result[STORAGE_KEY] as StorageData | undefined;
                resolve(storageData?.tier || 'free');
            });
        });
    }

    async setTier(tier: UserTier): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = (result[STORAGE_KEY] || {}) as StorageData;
                storageData.tier = tier;
                chrome.storage.local.set({ [STORAGE_KEY]: storageData }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
        });
    }

    async getFamilyMembers(): Promise<FamilyMember[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = result[STORAGE_KEY] as StorageData | undefined;
                resolve(storageData?.familyMembers || []);
            });
        });
    }

    async saveFamilyMembers(members: FamilyMember[]): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = (result[STORAGE_KEY] || {}) as StorageData;
                storageData.familyMembers = members;
                chrome.storage.local.set({ [STORAGE_KEY]: storageData }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
        });
    }

    async getSettings(): Promise<UserSettings> {
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = result[STORAGE_KEY] as StorageData | undefined;
                const defaultSettings: UserSettings = {
                    autoLockTimeout: 30,
                    clipboardClearTimeout: 30,
                    theme: 'dark',
                    lockOnBrowserLock: true,
                    lockOnWindowBlur: false,
                    lockOnPageNavigation: false
                };
                resolve({ ...defaultSettings, ...(storageData?.settings || {}) });
            });
        });
    }

    async saveSettings(settings: UserSettings): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                const storageData = (result[STORAGE_KEY] || {}) as StorageData;
                storageData.settings = settings;
                chrome.storage.local.set({ [STORAGE_KEY]: storageData }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
        });
    }
}

export const storageService = new StorageService();
