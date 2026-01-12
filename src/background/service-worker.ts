// Background service worker for Zk Vault
// Handles offscreen document for clipboard clearing and alarms

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

// Elite Tier: Volatile in-memory S-KEK Handover
let ephemeralSKEK: CryptoKey | null = null;

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
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    if (chrome.offscreen) {
        await chrome.offscreen.createDocument({
            url: path,
            reasons: ['CLIPBOARD'],
            justification: 'Clear clipboard after timeout',
        });
    } else {
        console.warn('Offscreen API not available');
    }
}

async function closeOffscreenDocument() {
    if (chrome.offscreen) {
        await chrome.offscreen.closeDocument();
    }
}

// Helper: Decode Base64
const base64ToUint8Array = (base64: string) => {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

// Helper: Get Unsealed PMK
async function getUnsealedMasterKey() {
    if (!ephemeralSKEK) return null;

    try {
        const sessionData = await chrome.storage.session.get(['sealedPmk', 'pmkIv']) as { sealedPmk?: string, pmkIv?: string };
        const sealedPmk = sessionData.sealedPmk;
        const pmkIv = sessionData.pmkIv;

        if (!sealedPmk || !pmkIv) return null;

        const sealedData = base64ToUint8Array(sealedPmk);
        const iv = base64ToUint8Array(pmkIv);

        const pmkRaw = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv } as any,
            ephemeralSKEK,
            sealedData
        );

        return await crypto.subtle.importKey(
            'raw',
            pmkRaw,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    } catch (e) {
        console.warn('Failed to unseal PMK');
        return null;
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

    if (request.type === 'SET_SESSION_KEK') {
        try {
            ephemeralSKEK = await crypto.subtle.importKey(
                'jwk',
                request.kekJwk,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            sendResponse({ status: 'OK' });
        } catch (e) {
            console.warn('KEK Handover failed');
            sendResponse({ status: 'ERROR' });
        }
        return;
    }

    if (request.type === 'TRACK_EVENT') {
        console.log(`[Analytics] ${request.name}`, request.properties);
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
            const masterKey = await getUnsealedMasterKey();
            if (!masterKey) {
                sendResponse({ status: 'LOCKED' });
                return;
            }

            const result = await chrome.storage.local.get('zk_vault_data');
            const storageData = result['zk_vault_data'] as any;

            if (!storageData || !storageData.vault || !storageData.vault.records) {
                sendResponse({ status: 'OK', credentials: [] });
                return;
            }

            const records = storageData.vault.records;
            const matches = [];

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

                    if (data.type && data.type !== 'login') continue;

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

                        if (storedHost === currentDomain) {
                            isMatch = true;
                        } else if (storedHost.endsWith('.' + currentDomain)) {
                            isMatch = true;
                        }
                    } catch (e) {
                        isMatch = storedUrl === currentDomain;
                    }

                    if (isMatch) {
                        matches.push({
                            title: data.title,
                            username: data.username,
                            password: data.password
                        });
                    }
                } catch (e) { }
            }

            const usageLimitCheck = async () => {
                const tier = storageData.tier || 'free';
                if (tier === 'free' && matches.length > 0) {
                    const now = new Date();
                    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
                    const usageResult = await chrome.storage.local.get('autofill_usage');
                    let usage = (usageResult.autofill_usage as any) || { month: currentMonth, domains: [] };

                    if (usage.month !== currentMonth) usage = { month: currentMonth, domains: [] };

                    if (!usage.domains.includes(request.domain)) {
                        if (usage.domains.length >= 3) {
                            sendResponse({
                                status: 'LIMIT_REACHED',
                                message: 'Monthly Free Tier limit reached.'
                            });
                            return true;
                        }
                        usage.domains.push(request.domain);
                        await chrome.storage.local.set({ autofill_usage: usage });
                    }
                }
                return false;
            };

            if (!(await usageLimitCheck())) {
                sendResponse({ status: 'OK', credentials: matches });
            }

        } catch (e) {
            console.warn('Autofill request failed');
            sendResponse({ status: 'ERROR' });
        }
    }

    if (request.type === 'OPEN_OPTIONS') {
        const url = chrome.runtime.getURL('options.html');
        chrome.tabs.create({ url: `${url}${request.hash ? '#' + request.hash : ''}` });
        sendResponse({ status: 'OK' });
        return;
    }

    if (request.type === 'CHECK_IF_SAVE_NEEDED') {
        const checkNeeded = async () => {
            const masterKey = await getUnsealedMasterKey();
            if (!masterKey) return;
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
                const masterKey = await getUnsealedMasterKey();
                if (!masterKey) return;

                const result = await chrome.storage.local.get('zk_vault_data');
                const storageData = result['zk_vault_data'] as any;
                if (!storageData || !storageData.vault) return;

                const { url, username, password, title } = request.record;
                const recordToSave = { title, username, password, url, notes: '', type: 'login' };
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
                console.warn('Direct record save failed');
                sendResponse({ status: 'ERROR' });
            }
        };
        addRecord();
        return;
    }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'clear-clipboard') {
        try {
            await setupOffscreenDocument(OFFSCREEN_PATH);
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'CLEAR_CLIPBOARD', data: '' });
            setTimeout(() => closeOffscreenDocument(), 1000);
        } catch (error) {
            console.warn('Clipboard cleanup deferred');
        }
    }
});

const VAULT_LOCKED_MSG = 'VAULT_LOCKED_MSG';

async function performPanicLock() {
    await chrome.storage.session.remove(['sealedPmk', 'pmkIv']);
    ephemeralSKEK = null;
    try {
        await setupOffscreenDocument(OFFSCREEN_PATH);
        chrome.runtime.sendMessage({ target: 'offscreen', type: 'CLEAR_CLIPBOARD', data: '' });
        setTimeout(() => closeOffscreenDocument(), 1000);
    } catch (e) { }
    chrome.runtime.sendMessage({ type: VAULT_LOCKED_MSG }).catch(() => { });
}

chrome.commands.onCommand.addListener((command) => {
    if (command === 'panic-lock') performPanicLock();
});

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'locked' || state === 'idle') await performPanicLock();
});
