/**
 * Cryptographic service for Zk Vault
 * Uses Web Crypto API and Argon2 (via WASM) for maximum security
 */
import { argon2id } from 'hash-wasm';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const KEY_LENGTH = 256;

// Argon2id Parameters (Memory-hard security)
const ARGON2_MEMORY = 65536; // 64MB
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 4;

export class CryptoService {
    /**
     * Generates a random salt
     */
    generateSalt(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    }

    /**
     * Generates a random IV
     */
    generateIV(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    }

    /**
     * Derives a cryptographic key from a text password using Argon2id (Primary)
     */
    async deriveKeyArgon2(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const hash = await argon2id({
            password: password,
            salt: salt,
            parallelism: ARGON2_PARALLELISM,
            iterations: ARGON2_ITERATIONS,
            memorySize: ARGON2_MEMORY,
            hashLength: 32,
            outputType: 'binary',
        });

        return crypto.subtle.importKey(
            "raw",
            hash as unknown as BufferSource,
            { name: "AES-GCM" },
            true, // Key must be extractable for session storage sharing
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Derives a cryptographic key from a text password using PBKDF2 (Legacy/Fallback)
     */
    async deriveKeyPBKDF2(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(password) as unknown as BufferSource,
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt as unknown as BufferSource,
                iterations: PBKDF2_ITERATIONS,
                hash: "SHA-256",
            },
            keyMaterial,
            { name: "AES-GCM", length: KEY_LENGTH },
            true, // Key must be extractable for session storage sharing
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Unified key derivation that supports both modern and legacy methods
     */
    async deriveKey(password: string, salt: Uint8Array, kdf: 'pbkdf2' | 'argon2id' = 'argon2id'): Promise<CryptoKey> {
        if (kdf === 'argon2id') {
            try {
                return await this.deriveKeyArgon2(password, salt);
            } catch (e) {
                console.warn("Argon2id failed, falling back to PBKDF2", e);
                // Fallback to PBKDF2 if Argon2 fails (e.g. WASM issues)
                return await this.deriveKeyPBKDF2(password, salt);
            }
        }
        return await this.deriveKeyPBKDF2(password, salt);
    }

    /**
     * Encrypts text data using AES-GCM
     * Returns object containing the encrypted content (base64) and IV (base64)
     */
    async encrypt(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
        const enc = new TextEncoder();
        const iv = this.generateIV();

        const encryptedContent = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv as unknown as BufferSource,
            },
            key,
            enc.encode(text)
        );

        return {
            ciphertext: this.arrayBufferToBase64(encryptedContent),
            iv: this.uint8ArrayToBase64(iv),
        };
    }

    /**
     * Decrypts text data using AES-GCM
     */
    async decrypt(ciphertext: string, ivStr: string, key: CryptoKey): Promise<string> {
        const iv = this.base64ToUint8Array(ivStr);
        const encryptedData = this.base64ToArrayBuffer(ciphertext);

        try {
            const decryptedContent = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv as unknown as BufferSource,
                },
                key,
                encryptedData
            );

            const dec = new TextDecoder();
            return dec.decode(decryptedContent);
        } catch (error) {
            throw new Error("Proof invalid (incorrect password or corrupted storage)");
        }
    }

    /**
     * Helper: ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Helper: Uint8Array to Base64
     */
    uint8ArrayToBase64(bytes: Uint8Array): string {
        return this.arrayBufferToBase64(bytes.buffer as ArrayBuffer);
    }

    /**
     * Helper: Base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        return Uint8Array.from(binaryString, c => c.charCodeAt(0)).buffer as ArrayBuffer;
    }

    base64ToUint8Array(base64: string): Uint8Array {
        const binaryString = window.atob(base64);
        return Uint8Array.from(binaryString, c => c.charCodeAt(0));
    }

    /**
     * Creates a hash of the password to verify correctness efficiently without simpler encryption
     * (e.g. for login check)
     */
    async hashPassword(_password: string, _salt: Uint8Array): Promise<string> {
        // Use PBKDF2 again or distinct SHA hash? 
        // Using derived bits of PBKDF2 is safe if we don't store the key.
        // But simpler: just use the derived key to encrypt a known constant (e.g. "VALID").
        return "NOT_IMPLEMENTED_USE_ENCRYPTION_CHECK";
    }
}

export const cryptoService = new CryptoService();
