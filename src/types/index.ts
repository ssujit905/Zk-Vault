// Decrypted record (in-memory only)
export interface PasswordRecord {
    id: string;
    title: string;
    username: string;
    password: string;
    url?: string;
    notes?: string;
    createdAt: number;
    updatedAt: number;
}

// Encrypted blob structure
export interface EncryptedBlob {
    ciphertext: string;
    iv: string;
}

// Encrypted record (storage)
export interface EncryptedPasswordRecord {
    id: string;
    encryptedData: EncryptedBlob; // Contains stringified JSON of (title, username, password, url, notes)
    createdAt: number;
    updatedAt: number;
}

export interface SecurityData {
    salt: string; // Base64 encoded salt for PBKDF2
    validation: EncryptedBlob; // Encrypted "VALID" string to verify password
}

export interface VaultData {
    records: EncryptedPasswordRecord[];
    security?: SecurityData;
    version: string;
}

export interface StorageData {
    vault?: VaultData;
    settings?: UserSettings;
}

export interface UserSettings {
    autoLockTimeout: number; // in minutes
    clipboardClearTimeout: number; // in seconds
    theme: 'dark' | 'light';
}
