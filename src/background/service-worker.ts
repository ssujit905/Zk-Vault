// Background service worker for Zk Vault
// Handles offscreen document for clipboard clearing and alarms

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Zk Vault installed successfully');

    // Create context menu for manual fill
    chrome.contextMenus.create({
        id: 'fill-with-vault',
        title: 'Fill with Zk Vault',
        contexts: ['editable']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'fill-with-vault' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_MANUAL_FILL' });
    }
});

// Setup offscreen document
async function setupOffscreenDocument(path: string) {
    // Check if offscreen document exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // Create offscreen document
    // @ts-ignore - TS might not know offline API yet
    if (chrome.offscreen) {
        // @ts-ignore
        await chrome.offscreen.createDocument({
            url: path,
            reasons: ['CLIPBOARD'], // @ts-ignore
            justification: 'Clear clipboard after timeout',
        });
    } else {
        console.warn('Offscreen API not available');
    }
}

async function closeOffscreenDocument() {
    // @ts-ignore
    if (chrome.offscreen) {
        // @ts-ignore
        await chrome.offscreen.closeDocument();
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep channel open
});

async function handleMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    if (request.type === 'PING') {
        sendResponse({ status: 'OK' });
        return;
    }

    if (request.type === 'SCHEDULE_CLIPBOARD_CLEAR') {
        chrome.alarms.clear('clear-clipboard', () => {
            chrome.alarms.create('clear-clipboard', { delayInMinutes: 0.5 });
            sendResponse({ status: 'SCHEDULED' });
        });
        return;
    }

    if (request.type === 'SEARCH_AUTOFILL') {
        try {
            // 1. Get Master Key from Session
            const session = await chrome.storage.session.get('masterKey');
            if (!session || !session.masterKey) {
                sendResponse({ status: 'LOCKED' });
                return;
            }

            // 2. Import Key
            const masterKey = await crypto.subtle.importKey(
                'jwk',
                session.masterKey,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // 3. Load Vault
            // Duplicate storage logic or import? Importing is better but for SW simplicity, direct call:
            const result = await chrome.storage.local.get('zk_vault_data');
            const storageData = result['zk_vault_data'] as any;

            if (!storageData || !storageData.vault || !storageData.vault.records) {
                sendResponse({ status: 'OK', credentials: [] });
                return;
            }

            const records = storageData.vault.records;
            const matches = [];

            // 4. Decrypt and Filter
            // Helper to decode Base64
            const base64ToUint8Array = (base64: string) => {
                const binary_string = atob(base64);
                const len = binary_string.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binary_string.charCodeAt(i);
                }
                return bytes;
            };

            for (const record of records) {
                try {
                    const iv = base64ToUint8Array(record.encryptedData.iv);
                    const ciphertext = base64ToUint8Array(record.encryptedData.ciphertext);

                    const decryptedContent = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: iv },
                        masterKey,
                        ciphertext
                    );

                    const dec = new TextDecoder();
                    const jsonStr = dec.decode(decryptedContent);
                    const data = JSON.parse(jsonStr);

                    // Only autofill login items
                    if (data.type && data.type !== 'login') continue;

                    // Check domain match
                    // data.url vs request.domain
                    // Strict domain matching
                    const storedUrl = data.url?.toLowerCase() || '';
                    const currentDomain = request.domain.toLowerCase();

                    let isMatch = false;
                    try {
                        let storedHost = '';
                        if (storedUrl.startsWith('http')) {
                            storedHost = new URL(storedUrl).hostname;
                        } else {
                            storedHost = new URL('https://' + storedUrl).hostname;
                        }

                        if (storedHost === currentDomain ||
                            storedHost.endsWith('.' + currentDomain) ||
                            currentDomain.endsWith('.' + storedHost)) {
                            isMatch = true;
                        }
                    } catch (e) {
                        // Fallback if URL is malformed
                        isMatch = storedUrl === currentDomain;
                    }

                    if (isMatch) {
                        matches.push({
                            title: data.title,
                            username: data.username,
                            password: data.password
                        });
                    }

                } catch (e) {
                    // decryption failed or bad record
                }
            }

            sendResponse({ status: 'OK', credentials: matches });

        } catch (e) {
            console.error(e);
            sendResponse({ status: 'ERROR' });
        }
    }

    if (request.type === 'CHECK_IF_SAVE_NEEDED') {
        const checkNeeded = async () => {
            const session = await chrome.storage.session.get('masterKey');
            if (!session || !session.masterKey) return; // Locked

            // We could check if exists, but for now just show banner if password is not empty
            if (request.data.password) {
                chrome.tabs.sendMessage(sender.tab?.id!, {
                    type: 'SHOW_SAVE_BANNER',
                    data: request.data
                });
            }
        };
        checkNeeded();
        return;
    }

    if (request.type === 'ADD_RECORD_DIRECT') {
        const addRecord = async () => {
            try {
                const session = await chrome.storage.session.get('masterKey');
                if (!session || !session.masterKey) return;

                const masterKey = await crypto.subtle.importKey(
                    'jwk',
                    session.masterKey,
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );

                const result = await chrome.storage.local.get('zk_vault_data');
                const storageData = result['zk_vault_data'] as any;
                if (!storageData || !storageData.vault) return;

                const { url, username, password, title } = request.record;
                const recordToSave = { title, username, password, url, notes: '' };
                const jsonStr = JSON.stringify(recordToSave);

                const iv = crypto.getRandomValues(new Uint8Array(12));
                const enc = new TextEncoder();
                const encryptedContent = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    masterKey,
                    enc.encode(jsonStr)
                );

                const uint8ArrayToBase64 = (bytes: Uint8Array) => {
                    let binary = '';
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
                    return btoa(binary);
                };

                const newRecord = {
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    encryptedData: {
                        ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedContent)),
                        iv: uint8ArrayToBase64(iv)
                    }
                };

                storageData.vault.records.push(newRecord);
                await chrome.storage.local.set({ ['zk_vault_data']: storageData });
                sendResponse({ status: 'SAVED' });
            } catch (e) {
                console.error(e);
                sendResponse({ status: 'ERROR' });
            }
        };
        addRecord();
        return;
    }

}

// Listen for alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'clear-clipboard') {
        try {
            await setupOffscreenDocument(OFFSCREEN_PATH);

            // Send message to offscreen document
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'CLEAR_CLIPBOARD',
                data: ''
            });

            // Close offscreen document after a delay to ensure processing
            setTimeout(() => {
                closeOffscreenDocument();
            }, 1000);

        } catch (error) {
            console.error('Failed to clear clipboard:', error);
        }
    }
});

const VAULT_LOCKED_MSG = 'VAULT_LOCKED_MSG';

async function performPanicLock() {
    console.log('Zk Vault: PANIC LOCK TRIGGERED');
    // 1. Wipe session memory
    await chrome.storage.session.remove('masterKey');

    // 2. Clear clipboard immediately
    try {
        await setupOffscreenDocument(OFFSCREEN_PATH);
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'CLEAR_CLIPBOARD',
            data: ''
        });
        setTimeout(() => closeOffscreenDocument(), 1000);
    } catch (e) {
        console.error('Panic: Failed to clear clipboard', e);
    }

    // 3. Notify all components
    chrome.runtime.sendMessage({ type: VAULT_LOCKED_MSG }).catch(() => { });
}

// Global Command Listener
chrome.commands.onCommand.addListener((command) => {
    if (command === 'panic-lock') {
        performPanicLock();
    }
});

// Listen for idle state changes (Auto-locking)
chrome.idle.setDetectionInterval(60); // 1 minute
chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'locked' || state === 'idle') {
        await performPanicLock();
    }
});
