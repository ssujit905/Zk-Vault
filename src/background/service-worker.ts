// Background service worker for Zk Vault
// Handles offscreen document for clipboard clearing and alarms

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Zk Vault installed successfully');
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
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleMessage(request, sendResponse);
    return true; // Keep channel open
});

async function handleMessage(request: any, sendResponse: (response: any) => void) {
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

                    // Check domain match
                    // data.url vs request.domain
                    if (data.url && data.url.toLowerCase().includes(request.domain.toLowerCase())) {
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

