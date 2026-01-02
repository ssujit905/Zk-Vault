import { cryptoService } from '../services/crypto';
import type { VaultRecord } from '../types';

export interface EncryptedBackup {
    version: number;
    salt: string;
    iv: string;
    ciphertext: string;
}

export const createEncryptedBackup = async (
    records: VaultRecord[],
    password: string
): Promise<EncryptedBackup> => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey(password, salt);

    const dataToEncrypt = {
        records,
        exportedAt: Date.now(),
        verification: 'ZK_VAULT_BACKUP_VERIFIED'
    };

    const jsonStr = JSON.stringify(dataToEncrypt);
    const { ciphertext, iv } = await cryptoService.encrypt(jsonStr, key);

    return {
        version: 1,
        salt: uint8ArrayToBase64(salt),
        iv,
        ciphertext
    };
};

export const restoreFromEncryptedBackup = async (
    backup: EncryptedBackup,
    password: string
): Promise<VaultRecord[]> => {
    const salt = base64ToUint8Array(backup.salt);
    const key = await cryptoService.deriveKey(password, salt);

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
