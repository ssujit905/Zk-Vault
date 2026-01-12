/// <reference types="chrome" />
import './autofill.css';

class AutofillManager {
    private inputs: HTMLInputElement[] = [];

    constructor() {
        this.init();
    }

    private init() {
        // Elite Tier Security: Only run in the top-level window to prevent iframe harvesting
        if (window.top !== window) {
            // console.log('Zk Vault: Autofill disabled in iframe for security');
            return;
        }

        // Initial scan
        this.scanInputs();

        // Delayed retry for SPAs
        setTimeout(() => this.scanInputs(), 1500);
        setTimeout(() => this.scanInputs(), 5000);

        this.observeDOM();
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request) => {
            if (request.type === 'SHOW_SAVE_BANNER') {
                this.showSaveBanner(request.data);
            } else if (request.type === 'TRIGGER_MANUAL_FILL') {
                this.handleManualFillTrigger();
            }
        });
    }

    private handleManualFillTrigger() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            const input = activeElement as HTMLInputElement;
            // Find or attach icon if not exists
            if (!input.getAttribute('data-zk-vault-bound')) {
                this.attachIcon(input);
                input.setAttribute('data-zk-vault-bound', 'true');
                this.inputs.push(input);
            }
            // Trigger the handleIconClick logic
            // We need a reference to the icon or just call the click logic directly
            // For now, let's just trigger a search and show dropdown near the input
            this.handleIconClick(input);
        }
    }

    scanInputs() {
        const allPasswordInputs: HTMLInputElement[] = [];
        this.findAllInputs(document, allPasswordInputs);

        allPasswordInputs.forEach((input) => {
            if (input.getAttribute('data-zk-vault-bound')) return;
            this.attachIcon(input);
            input.setAttribute('data-zk-vault-bound', 'true');
            this.inputs.push(input);
        });

        // Bind to forms for save-on-submit (root level)
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (form.getAttribute('data-zk-vault-submit-bound')) return;
            form.addEventListener('submit', () => this.handleFormSubmit(form as HTMLFormElement));
            form.setAttribute('data-zk-vault-submit-bound', 'true');
        });
    }

    private findAllInputs(root: Document | ShadowRoot | Element, results: HTMLInputElement[]) {
        // 1. Find directly in this root
        const passwordInputs = root.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => results.push(input as HTMLInputElement));

        // 2. We could also look for text/email inputs if we wanted to attach icons there, 
        // but for now we focus on password fields for the trigger.

        // 3. Find and recurse into Shadow Roots
        // querySelectorAll doesn't cross shadow boundaries, but we can find elements with shadow roots
        const allElements = root.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.shadowRoot) {
                this.findAllInputs(el.shadowRoot, results);
            }
        });
    }

    handleFormSubmit(form: HTMLFormElement) {
        const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;
        if (!passwordInput || !passwordInput.value) return;

        // Try to find username
        let username = '';
        const userInputs = form.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="submit"])');
        if (userInputs.length > 0) {
            // Find first visible input
            for (const input of Array.from(userInputs)) {
                if ((input as HTMLElement).offsetParent !== null) {
                    username = (input as HTMLInputElement).value;
                    break;
                }
            }
        }

        chrome.runtime.sendMessage({
            type: 'CHECK_IF_SAVE_NEEDED',
            data: {
                url: window.location.hostname,
                username: username,
                password: passwordInput.value,
                title: document.title || window.location.hostname
            }
        });
    }

    showSaveBanner(data: any) {
        if (document.getElementById('zk-vault-save-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'zk-vault-save-banner';
        banner.className = 'zk-vault-save-banner';
        banner.innerHTML = `
            <div class="zk-vault-save-content">
                <img src="${chrome.runtime.getURL('icons/icon48.png')}" class="zk-vault-save-logo" />
                <span>Save credentials for <strong>${data.url}</strong> to Zk Vault?</span>
            </div>
            <div class="zk-vault-save-actions">
                <button class="zk-vault-save-btn zk-vault-save-confirm">Save</button>
                <button class="zk-vault-save-btn zk-vault-save-cancel">No thanks</button>
            </div>
        `;
        document.body.appendChild(banner);

        banner.querySelector('.zk-vault-save-confirm')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'ADD_RECORD_DIRECT', record: data });
            banner.remove();
        });

        banner.querySelector('.zk-vault-save-cancel')?.addEventListener('click', () => {
            banner.remove();
        });

        setTimeout(() => banner.remove(), 15000);
    }

    private scanTimeout: any = null;
    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
                if (mutation.type === 'attributes' && (mutation.target as Element).tagName === 'INPUT') {
                    shouldScan = true;
                    break;
                }
            }

            if (shouldScan) {
                if (this.scanTimeout) clearTimeout(this.scanTimeout);
                this.scanTimeout = setTimeout(() => this.scanInputs(), 200);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['type', 'style', 'class']
        });
    }

    attachIcon(input: HTMLInputElement) {
        const icon = document.createElement('div');
        icon.className = 'zk-vault-icon';
        icon.style.backgroundImage = `url('${chrome.runtime.getURL('icons/icon48.png')}')`;
        document.body.appendChild(icon);

        const updatePosition = () => {
            if (!input.isConnected) {
                icon.remove();
                return;
            }
            const rect = input.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            icon.style.left = `${rect.right + scrollX - 25}px`;
            icon.style.top = `${rect.top + scrollY + (rect.height - 20) / 2}px`;

            if (rect.width === 0 || rect.height === 0 || input.offsetParent === null) {
                icon.style.display = 'none';
            } else {
                icon.style.display = 'block';
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        // Map input to its icon for manual fill triggers
        (input as any).__zk_vault_icon = icon;

        icon.addEventListener('click', () => {
            this.handleIconClick(input, icon);
        });
    }

    async handleIconClick(input: HTMLInputElement, icon?: HTMLElement) {
        // If icon wasn't provided (manual fill), use the stored one or the input itself as anchor
        const anchor = icon || (input as any).__zk_vault_icon || input;

        if (document.querySelector('.zk-vault-dropdown')) {
            document.querySelector('.zk-vault-dropdown')?.remove();
            return;
        }

        const domain = window.location.hostname;

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'SEARCH_AUTOFILL',
                domain: domain
            });

            if (response && response.status === 'LOCKED') {
                alert('Zk Vault is locked. Please click the extension icon to unlock.');
                return;
            }

            if (response && response.status === 'LIMIT_REACHED') {
                this.showUpgradeNudge(response.message);
                return;
            }

            if (response && response.status === 'OK' && response.credentials.length > 0) {
                this.showDropdown(input, anchor, response.credentials);
            } else if (!icon) {
                // If manual fill and no credentials, show alert
                alert('No credentials found for ' + domain);
            }
        } catch (e) {
            console.error('Autofill error:', e);
        }
    }

    showUpgradeNudge(message: string) {
        if (document.getElementById('zk-vault-upgrade-nudge')) return;

        const nudge = document.createElement('div');
        nudge.id = 'zk-vault-upgrade-nudge';
        nudge.className = 'zk-vault-save-banner zk-vault-upgrade-nudge'; // Reuse base styles
        nudge.innerHTML = `
            <div class="zk-vault-save-content">
                <div class="zk-vault-nudge-icon">💎</div>
                <span>${message}</span>
            </div>
            <div class="zk-vault-save-actions">
                <button class="zk-vault-save-btn zk-vault-upgrade-confirm">Go Pro</button>
                <button class="zk-vault-save-btn zk-vault-save-cancel">Maybe later</button>
            </div>
        `;
        document.body.appendChild(nudge);

        nudge.querySelector('.zk-vault-upgrade-confirm')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                type: 'TRACK_EVENT',
                name: 'autofill_limit_nudge_click'
            });
            chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS', hash: 'billing' });
            nudge.remove();
        });

        nudge.querySelector('.zk-vault-save-cancel')?.addEventListener('click', () => {
            nudge.remove();
        });
    }

    showDropdown(input: HTMLInputElement, icon: HTMLElement, credentials: any[]) {
        const dropdown = document.createElement('div');
        dropdown.className = 'zk-vault-dropdown';

        const iconRect = icon.getBoundingClientRect();
        dropdown.style.left = `${iconRect.left + window.scrollX}px`;
        dropdown.style.top = `${iconRect.bottom + window.scrollY + 5}px`;

        credentials.forEach(cred => {
            const item = document.createElement('div');
            item.className = 'zk-vault-dropdown-item';

            item.innerHTML = `
            <div class="zk-vault-dropdown-title">${cred.title}</div>
            <div class="zk-vault-dropdown-user">${cred.username}</div>
          `;

            item.addEventListener('click', () => {
                // Heuristic Security Check: Verify form action if possible
                const form = input.form;
                if (form && (form as HTMLFormElement).action) {
                    try {
                        const actionUrl = new URL((form as HTMLFormElement).action);
                        const currentUrl = new URL(window.location.href);
                        if (actionUrl.hostname !== currentUrl.hostname && !actionUrl.hostname.endsWith('.' + currentUrl.hostname)) {
                            if (!confirm(`Warning: This form is sending data to a different domain (${actionUrl.hostname}). Do you still want to fill?`)) {
                                dropdown.remove();
                                return;
                            }
                        }
                    } catch (e) {
                        // Action is relative or malformed, continue
                    }
                }

                this.fillCredentials(input, cred);
                dropdown.remove();
            });

            dropdown.appendChild(item);
        });

        // Close on click outside
        const closeHandler = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node) && e.target !== icon) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };

        // Delay specific timeout to prevent immediate close due to bubbling
        setTimeout(() => document.addEventListener('click', closeHandler), 0);

        document.body.appendChild(dropdown);
    }

    fillCredentials(passwordInput: HTMLInputElement, credential: any) {
        // 1. Fill password
        passwordInput.value = credential.password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 2. Try to find the username input
        // Simple heuristic: previous input element in form
        let prev = passwordInput.previousElementSibling;
        while (prev) {
            if (prev.tagName === 'INPUT' && (prev as HTMLInputElement).type !== 'hidden' && (prev as HTMLInputElement).type !== 'submit') {
                (prev as HTMLInputElement).value = credential.username;
                prev.dispatchEvent(new Event('input', { bubbles: true }));
                prev.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
            // Also search children of prev sibling (wrapper divs)
            const nestedInput = prev.querySelector('input:not([type="hidden"]):not([type="submit"])');
            if (nestedInput) {
                (nestedInput as HTMLInputElement).value = credential.username;
                nestedInput.dispatchEvent(new Event('input', { bubbles: true }));
                nestedInput.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }

            prev = prev.previousElementSibling;
        }

        // If sibling search failed, try generic get by type="text" or "email" in same form
        if (!prev && passwordInput.form) {
            const inputs = Array.from(passwordInput.form.querySelectorAll('input'));
            const passIndex = inputs.indexOf(passwordInput);
            if (passIndex > 0) {
                const userInputs = inputs.slice(0, passIndex).reverse();
                const target = userInputs.find(i =>
                    (i.type === 'text' || i.type === 'email') && i.offsetParent !== null
                );
                if (target) {
                    target.value = credential.username;
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
    }
}

new AutofillManager();
