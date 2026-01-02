/**
 * Checks if a stored URL matches the current domain using strict rules.
 */
export const isDomainMatch = (storedUrl: string, currentDomain: string): boolean => {
    try {
        if (!storedUrl) return false;

        // Normalize stored URL
        let normalizedStored = storedUrl.toLowerCase();
        if (!normalizedStored.startsWith('http')) {
            normalizedStored = 'https://' + normalizedStored;
        }

        const storedHost = new URL(normalizedStored).hostname;
        const currentHost = currentDomain.toLowerCase();

        // Exact match
        if (storedHost === currentHost) return true;

        // Subdomain match (e.g., mail.google.com matches google.com)
        // We check if currentHost is a suffix of storedHost or vice versa,
        // but we must be careful with partial matches (e.g., example.com vs ample.com)
        if (storedHost.endsWith('.' + currentHost)) return true;
        if (currentHost.endsWith('.' + storedHost)) return true;

        return false;
    } catch (e) {
        // Fallback to simple include if URL parsing fails, but with more caution
        const s = storedUrl.toLowerCase();
        const c = currentDomain.toLowerCase();
        return s === c || s.includes('.' + c) || c.includes('.' + s);
    }
};
