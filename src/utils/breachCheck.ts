/**
 * HIBP k-Anonymity Breach Checker
 * This utility implements the gold-standard security check for pwned passwords.
 * 1. Hash password locally with SHA-1
 * 2. Send only first 5 chars of hash to HIBP (Range API)
 * 3. Locally verify if full hash exists in returned list
 * This preserves Zero-Knowledge integrity.
 */

/**
 * Generates SHA-1 hash of a string
 */
async function sha1(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export interface BreachInfo {
    isPwned: boolean;
    count: number;
}

// 24 hour cache expiry
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Checks if a password has been seen in a data breach
 * Elite Tier: Implements local caching of breach results to minimize network calls and preserve privacy.
 */
export async function checkPasswordBreach(password: string): Promise<BreachInfo> {
    if (!password) return { isPwned: false, count: 0 };

    try {
        const fullHash = await sha1(password);
        const prefix = fullHash.substring(0, 5);
        const suffix = fullHash.substring(5);

        // 1. Check local cache first
        const cacheKey = `breach_cache_${prefix}`;
        const cacheResult = await chrome.storage.local.get(cacheKey);

        if (cacheResult[cacheKey]) {
            const entry = cacheResult[cacheKey] as { timestamp: number, data: string };
            const { timestamp, data } = entry;
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                const lines = (data as string).split('\n');
                for (const line of lines) {
                    const [h, count] = line.split(':');
                    if (h.trim() === suffix) {
                        return { isPwned: true, count: parseInt(count, 10) };
                    }
                }
                return { isPwned: false, count: 0 };
            }
        }

        // 2. Fetch partial hash list (Range API) if not in cache or expired
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);

        if (!response.ok) {
            throw new Error('HIBP API request failed');
        }

        const data = await response.text();

        // 3. Store in cache
        await chrome.storage.local.set({
            [cacheKey]: {
                timestamp: Date.now(),
                data: data
            }
        });

        // 4. Process results
        const lines = data.split('\n');
        for (const line of lines) {
            const [h, count] = line.split(':');
            if (h.trim() === suffix) {
                return {
                    isPwned: true,
                    count: parseInt(count, 10)
                };
            }
        }

        return { isPwned: false, count: 0 };
    } catch (error) {
        console.warn('Hibp breach check unavailable (network or API limit)');
        return { isPwned: false, count: 0 };
    }
}
