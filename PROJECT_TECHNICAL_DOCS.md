# Zk Vault: Technical Architecture & Security Specifications

## 1. Project Overview
**Zk Vault** is an elite-tier, high-security Chrome Extension designed for zero-knowledge credential management and digital identity protection. Built on a "Privacy-First" foundation, it ensures that sensitive data belongs exclusively to the user. No plaintext secrets, master keys, or metadata ever leave the local environment.

---

## 2. Zero-Knowledge (ZK) Principles
*   **Local-Only Decryption**: All data is encrypted using keys derived on the user's machine before being persisted.
*   **Invisible Master Password**: The application never transmits or stores the master password. It exists only in volatile memory during active sessions.
*   **Volatile Session Lifetime**: Sensitive keys are automatically purged on extension reload, browser close, or idle timeout.

---

## 3. Cryptographic Implementation (Elite Tier)
Zk Vault utilizes the **Web Crypto API** combined with **WASM-powered Argon2id** for a multi-layered defense.

### 🔑 Key Derivation Functions (KDF)
-   **Primary (Argon2id)**: New vaults and password updates utilize Argon2id (via `hash-wasm`).
    -   **Memory Cost**: 64 MB
    -   **Iterations**: 3
    -   **Parallelism**: 4
    -   **Hash Length**: 32 bytes
-   **Legacy (PBKDF2)**: 100,000 iterations of SHA-256 for backward compatibility with older vaults.

### 🔐 Master Key Security (KEK Pattern)
To protect the Primary Master Key (PMK) even if the machine is compromised while the browser is running:
1.  **Primary Master Key (PMK)**: Derived from the master password.
2.  **Session KEK**: A volatile, 256-bit AES key generated in React state (`AuthContext`).
3.  **Sealed PMK**: The PMK is encrypted with the Session KEK and stored in `chrome.storage.session`.
4.  **Instant Protection**: Because the KEK is never persisted, refreshing the extension or closing the UI context "unseals" the memory, making the stored PMK permanently unrecoverable without the master password.

### 🔐 Record Encryption (AES-GCM)
All vault records (Logins, Cards, Notes) use:
-   **Algorithm**: AES-GCM 256-bit.
-   **Nonces (IV)**: A unique 12-byte (96-bit) IV is generated for *every single* record and backup operation.
-   **Authenticated Tags**: Ensures data integrity and prevents undetected ciphertext tampering.

---

## 4. Advanced Security Features

### 🚀 Hardened Autofill Engine
-   **Confirmation-First Policy**: Credentials are only filled after explicit user selection via a secure "Zk" trigger.
-   **Environment Isolation**: Autofill logic is disabled in 3rd-party/untrusted iframes to prevent data harvesting.
-   **Heuristic Domain Matching**: Inspects form `action` URLs and warns users if data is being sent to a mismatched or suspicious domain.

### 🔍 Optimized Security Audit
-   **k-Anonymity Breach Check**: Uses the HIBP Range API. Only the first 5 characters of a SHA-1 hash prefix are sent; matching is completed locally.
-   **HIBP Local Cache**: Results are cached for 24 hours to maximize privacy and reduce network footprint.
-   **Offline Entropy Engine**: Uses a local cryptographic entropy model ($L \cdot \log_2(N)$) to calculate bit-strength scores (0-4) without any API calls.

### 📋 Forensic Clipboard Shredding
-   **Multi-Stage Overwrite**: Instead of a simple clear, the system performs a sequence of overwrites with randomized noise and redaction tokens ("CLEARED BY ZK VAULT").
-   **Offscreen Sanitization**: Uses a dedicated Chrome Offscreen document to ensure the clipboard is shredded even when the extension popup is closed.

### 🚨 Secure Delete Strategy
-   **Record Shredding**: Before a record is removed from the vault, its content is overwritten with randomized junk and saved to storage. This ensures the original encrypted fragments are displaced on the hardware before the reference is deleted.

---

## 5. Vault Lock Policy Engine
Dynamic security rules enforced by the background service worker:
-   **Auto-Lock on Idle**: User-configurable timeout (1–1440 minutes) synced with `chrome.idle`.
-   **Lock on Focus Loss**: Seals the vault the moment the browser window is minimized or the user switches applications.
-   **Lock on System Lock**: Ties vault accessibility to the OS lock state.

---

## 6. Data Integrity & Portability
-   **Encrypted Backups (v2)**: Exports use Argon2id for key derivation, making them resistant to offline brute-force.
-   **Integrity Checksums**: Backups include a SHA-256 hash of the ciphertext to verify file integrity and detect manipulation.
-   **Forensic Validation**: On unlock, the system decrypts a "Safety Blob" to verify key correctness before attempting to load user records.

---

## 7. Technical Infrastructure
*   **Architecture**: React 19 + TypeScript + Vite.
*   **State Management**: Context Provider pattern (`AuthContext`, `VaultContext`).
*   **Messaging**: Manifest v3 `runtime.sendMessage` with origin-safe validation.
*   **Integrity Signals**: Background monitor detects "Dev Mode" (unpacked) environments and marks them as "Untrusted" integrity states.
*   **Content Security Policy (CSP)**: Implements Manifest V3 compliant CSP with `'wasm-unsafe-eval'` to permit secure, high-performance execution of the Argon2id WASM module while strictly forbidding external script injection.

---

## 8. Technology Stack
*   **Core**: React, Vite, TypeScript.
*   **Design**: Vanilla CSS 4, Tailwind utilities, Custom Glassmorphism.
*   **Icons**: Lucide React.
*   **Crypto**: Web Crypto API, `hash-wasm` (Argon2id).
*   **Storage**: `chrome.storage.local` (persistent), `chrome.storage.session` (ephemeral).
