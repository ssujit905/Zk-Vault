/// <reference types="chrome" />
import './autofill.css';

class AutofillManager {
    private inputs: HTMLInputElement[] = [];

    constructor() {
        this.scanInputs();
        this.observeDOM();
    }

    scanInputs() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach((input) => {
            // Avoid duplicate binding
            if (input.getAttribute('data-zk-vault-bound')) return;

            this.attachIcon(input as HTMLInputElement);
            input.setAttribute('data-zk-vault-bound', 'true');
            this.inputs.push(input as HTMLInputElement);
        });
    }

    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.scanInputs();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    attachIcon(input: HTMLInputElement) {
        console.log('Zk Vault: Attaching icon to', input);
        const icon = document.createElement('div');
        icon.className = 'zk-vault-icon';
        icon.style.backgroundImage = `url('${chrome.runtime.getURL('icons/icon48.png')}')`;
        document.body.appendChild(icon);

        const updatePosition = () => {
            const rect = input.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            // Position icon on the right side of input
            icon.style.left = `${rect.right + scrollX - 25}px`;
            icon.style.top = `${rect.top + scrollY + (rect.height - 20) / 2}px`;

            // Hide if input is hidden
            if (rect.width === 0 || rect.height === 0 || input.offsetParent === null) {
                icon.style.display = 'none';
            } else {
                icon.style.display = 'block';
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // Capture for internal scrolls

        icon.addEventListener('click', () => {
            this.handleIconClick(input, icon);
        });
    }

    async handleIconClick(input: HTMLInputElement, icon: HTMLElement) {
        if (document.querySelector('.zk-vault-dropdown')) {
            document.querySelector('.zk-vault-dropdown')?.remove();
            return; // Toggle off
        }

        // Identify domain
        const domain = window.location.hostname;

        // Request credentials from background
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'SEARCH_AUTOFILL',
                domain: domain
            });

            if (response && response.status === 'LOCKED') {
                alert('Zk Vault is locked. Please click the extension icon to unlock.');
                return;
            }

            if (response && response.status === 'OK' && response.credentials.length > 0) {
                this.showDropdown(input, icon, response.credentials);
            } else {
                console.log('No credentials found for this domain.');
                // Optional: Flash icon red?
            }
        } catch (e) {
            console.error('Autofill error:', e);
        }
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
