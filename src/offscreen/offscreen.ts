/// <reference types="chrome" />

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'CLEAR_CLIPBOARD') {
        handleClearClipboard(message.data);
    }
});

const handleClearClipboard = async (_: string) => {
    try {
        await navigator.clipboard.writeText('');
    } catch (e) {
        console.error('Failed to clear clipboard', e);
    }
};
