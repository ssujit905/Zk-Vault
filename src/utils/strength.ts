/**
 * Elite Tier: Entropy-based Password Strength Estimator
 * Calculates entropy (bits) and complexity without any network calls.
 */

export interface StrengthResult {
    score: 0 | 1 | 2 | 3 | 4; // 0-4 scale similar to zxcvbn
    bits: number;
    label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
    suggestions: string[];
}

export const estimateStrength = (password: string): StrengthResult => {
    if (!password) {
        return { score: 0, bits: 0, label: 'Very Weak', suggestions: [] };
    }

    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 33;

    // Entropy calculation: L * log2(N)
    const entropy = password.length * Math.log2(charsetSize);

    let score: 0 | 1 | 2 | 3 | 4 = 0;
    if (entropy > 80) score = 4;
    else if (entropy > 60) score = 3;
    else if (entropy > 40) score = 2;
    else if (entropy > 25) score = 1;

    const labels: Record<number, StrengthResult['label']> = {
        0: 'Very Weak',
        1: 'Weak',
        2: 'Medium',
        3: 'Strong',
        4: 'Very Strong'
    };

    const suggestions: string[] = [];
    if (password.length < 12) suggestions.push('Make it longer (at least 12 chars).');
    if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Add special characters.');
    if (!/[A-Z]/.test(password)) suggestions.push('Include uppercase letters.');

    return {
        score,
        bits: Math.round(entropy),
        label: labels[score],
        suggestions
    };
};
