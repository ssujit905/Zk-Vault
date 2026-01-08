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
        await navigator.clipboard.writeText('');
    } catch (e) {
        // Method 2: Fallback using textarea + execCommand
        // This is often more reliable in offscreen documents
        try {
            const textarea = document.getElementById('text') as HTMLTextAreaElement;
            if (textarea) {
                textarea.value = '';
                textarea.select();
                document.execCommand('copy');
                // console.log('Clipboard cleared using fallback');
            }
        } catch (fallbackError) {
            console.warn('Clipboard cleanup failed after all attempts');
        }
    }
};
