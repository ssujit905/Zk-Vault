import { cryptoService } from '../services/crypto';
import type { VaultRecord } from '../types';

export interface EncryptedBackup {
    version: number;
    salt: string;
    iv: string;
    ciphertext: string;
    checksum: string; // SHA-256 of ciphertext
}

export const createEncryptedBackup = async (
    records: VaultRecord[],
    password: string
): Promise<EncryptedBackup> => {
    const salt = cryptoService.generateSalt();
    // Use Argon2id for backup key derivation for maximum security
    const key = await cryptoService.deriveKey(password, salt, 'argon2id');

    const dataToEncrypt = {
        records,
        exportedAt: Date.now(),
        verification: 'ZK_VAULT_BACKUP_VERIFIED'
    };

    const jsonStr = JSON.stringify(dataToEncrypt);
    const { ciphertext, iv } = await cryptoService.encrypt(jsonStr, key);

    // Generate integrity checksum
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ciphertext));
    const checksum = cryptoService.arrayBufferToBase64(hashBuffer);

    return {
        version: 2,
        salt: uint8ArrayToBase64(salt),
        iv,
        ciphertext,
        checksum
    };
};

export const restoreFromEncryptedBackup = async (
    backup: EncryptedBackup,
    password: string
): Promise<VaultRecord[]> => {
    // 1. Verify Integrity first
    if (backup.checksum) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(backup.ciphertext));
        const currentChecksum = cryptoService.arrayBufferToBase64(hashBuffer);
        if (currentChecksum !== backup.checksum) {
            throw new Error('Integrity check failed: Backup file appears corrupted or tampered with.');
        }
    }

    const salt = base64ToUint8Array(backup.salt);
    // Support both Argon2id (v2) and PBKDF2 (legacy v1)
    const key = await cryptoService.deriveKey(password, salt, backup.version >= 2 ? 'argon2id' : 'pbkdf2');

    const decryptedStr = await cryptoService.decrypt(backup.ciphertext, backup.iv, key);
    const data = JSON.parse(decryptedStr);

    if (data.verification !== 'ZK_VAULT_BACKUP_VERIFIED') {
        throw new Error('Invalid backup format or incorrect password');
    }

    return data.records;
};

// Internal helpers since cryptoService helpers are private
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}
