# Zk Vault: Technical Architecture & Security Specifications

## 1. Project Overview
**Zk Vault** is a state-of-the-art, high-security Chrome Extension designed for password management and digital identity protection. Built on the principle of **Zero-Knowledge (ZK)**, the application ensures that sensitive data belongs exclusively to the user. No plaintext passwords, credit card numbers, or notes ever leave the user's local environment.

---

## 2. Security Architecture (Zero-Knowledge)
The core of Zk Vault is its Zero-Knowledge design. This means:
*   **Local Encryption**: All data is encrypted using keys derived on the user's machine before being persisted to storage.
*   **No Server-Side Knowledge**: There is no central server that stores or even sees the user's master password.
*   **Key Derivation**: Security is anchored in a user-defined Master Password, which acts as the source of truth for all encryption keys.

---

## 3. Cryptographic Implementation
Zk Vault utilizes the browser's native **Web Crypto API** for industrial-grade security performance and reliability.

### 🔑 Key Derivation (PBKDF2)
When a user sets up or unlocks the vault, a cryptographic key is derived from the master password using:
- **Algorithm**: PBKDF2 (Password-Based Key Derivation Function 2).
- **Hashing**: SHA-256.
- **Iterations**: 100,000 (making brute-force attacks computationally expensive).
- **Salt**: 16-byte cryptographically secure random salt generated on setup.

### 🔐 Data Encryption (AES-GCM)
All vault records (Logins, Cards, Notes, Identities) are encrypted using:
- **Algorithm**: AES-GCM (Advanced Encryption Standard in Galois/Counter Mode).
- **Key Length**: 256-bit.
- **Initialization Vector (IV)**: A unique 12-byte (96-bit) IV is generated for every single encryption operation to prevent pattern matching.
- **Authentication**: GCM provides built-in authentication tag verification, ensuring that stored data hasn't been tampered with or corrupted.

---

## 4. Key Features & Technical Logic

### 🚀 Smart Autofill
The extension injects a secure content script (`autofill.ts`) that detects login forms. It communicates via the background service worker to fetch matching credentials only when the vault is unlocked.

### 🔍 HIBP Breach Checker (k-Anonymity)
Zk Vault includes a professional-grade "Pwned" check:
1.  **Local Hash**: The password is hashed locally using SHA-1.
2.  **k-Anonymity**: Only the first 5 characters of the hash are sent to the "Have I Been Pwned" Range API.
3.  **Local Match**: The API returns a list of suffix hashes; Zk Vault checks for a match locally. 
*Result: Your full hash or password is never sent to the HIBP server.*

### 📋 Secure Clipboard Management
To prevent clipboard data leakage:
- **Auto-Clear**: The extension automatically clears the clipboard after a configurable timeout (default 30-60s).
- **Offscreen Fallback**: Uses a dedicated Chrome Offscreen document to ensure clipboard clearing works even when the extension popup is closed or the background script is idling.

### 🚨 Emergency Panic Lock
A single click immediately:
- Wipes all session keys from memory.
- Clears the clipboard.
- Terminates all active authorized sessions.
- Requires the Master Password for any subsequent access.

---

## 5. Technology Stack
*   **Frontend**: React.ts with Vite for lightning-fast build cycles.
*   **Styling**: Modern CSS with Tailwind utilities and custom Glassmorphism effects.
*   **Icons**: Lucide React for consistent, high-quality iconography.
*   **Storage**: `chrome.storage.local` for persistent data and `chrome.storage.session` for temporary, non-persistent session state.
*   **Language**: Strict TypeScript for type-safety and reduced runtime errors.

---

## 6. Data Integrity & Portability
- **JSON Export/Import**: Users can export their entire vault as an encrypted JSON backup file, protected by a secondary user-provided backup password.
- **Validation**: On login, Zk Vault decrypts a hidden "Validation Blob" (the string "VALID") to verify the master password's correctness before attempting to load user data.

---

## 7. Development Philosophy
Zk Vault follows a **Clean Code** and **Modular** approach:
- **Context API**: Centralized `AuthContext` and `VaultContext` for state management.
- **Service Pattern**: Segregated logic for `cryptoService`, `storageService`, and `analyticsService`.
- **UI First**: Premium UX design focusing on transparency, feedback, and ease of use.
