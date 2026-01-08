export type UserTier = 'free' | 'pro' | 'family';
export type VaultItemType = 'login' | 'note' | 'identity' | 'card';

// Decrypted record (in-memory only)
export interface BaseRecord {
    id: string;
    type: VaultItemType;
    title: string;
    notes?: string;
    favorite?: boolean;
    customIcon?: string;
    createdAt: number;
    updatedAt: number;
}

export interface LoginRecord extends BaseRecord {
    type: 'login';
    username: string;
    password: string;
    url?: string;
}

export interface NoteRecord extends BaseRecord {
    type: 'note';
    content: string;
}

export interface IdentityRecord extends BaseRecord {
    type: 'identity';
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
}

export interface CardRecord extends BaseRecord {
    type: 'card';
    cardholderName: string;
    cardNumber: string;
    expiryDate: string; // MM/YY
    cvv: string;
    brand?: string; // Visa, Master, etc.
}

export type VaultRecord = LoginRecord | NoteRecord | IdentityRecord | CardRecord;

// Backward compatibility alias
export type PasswordRecord = LoginRecord;

// Encrypted blob structure
export interface EncryptedBlob {
    ciphertext: string;
    iv: string;
}

// Encrypted record (storage)
export interface EncryptedVaultRecord {
    id: string;
    encryptedData: EncryptedBlob;
    createdAt: number;
    updatedAt: number;
}

// Backward compatibility alias
export type EncryptedPasswordRecord = EncryptedVaultRecord;

export interface SecurityData {
    salt: string; // Base64 encoded salt for PBKDF2
    validation: EncryptedBlob; // Encrypted "VALID" string to verify password
}

export interface VaultData {
    records: EncryptedVaultRecord[];
    security?: SecurityData;
    version: string;
}

export interface StorageData {
    vault?: VaultData;
    settings?: UserSettings;
    tier?: UserTier;
    familyMembers?: FamilyMember[];
}

export interface FamilyMember {
    id: string;
    name: string;
    email: string;
    status: 'pending' | 'active';
    role: 'admin' | 'member';
    emergencyAccess: boolean;
    addedAt: number;
}

export interface UserSettings {
    autoLockTimeout: number; // in minutes
    clipboardClearTimeout: number; // in seconds
    theme: 'dark' | 'light';
}
