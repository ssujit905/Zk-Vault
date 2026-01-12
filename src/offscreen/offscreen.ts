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
        // Method 1: Modern Clipboard API
        // Elite Tier: Sequence Overwrite to disrupt OS clipboard history managers
        await navigator.clipboard.writeText(`WIPE_${Math.random().toString(36).slice(2, 10)}`);
        await navigator.clipboard.writeText("CLEARED BY ZK VAULT");
        await navigator.clipboard.writeText('');
    } catch (e) {
        // Method 2: Fallback using textarea + execCommand
        try {
            const textarea = document.getElementById('text') as HTMLTextAreaElement;
            if (textarea) {
                textarea.value = `WIPE_${Math.random().toString(36).slice(2, 10)}`;
                textarea.select();
                document.execCommand('copy');

                textarea.value = '';
                textarea.select();
                document.execCommand('copy');
            }
        } catch (fallbackError) {
            console.warn('Clipboard cleanup failed after all attempts');
        }
    }
};
