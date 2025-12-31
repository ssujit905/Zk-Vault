import type { PasswordRecord } from '../types';

export interface AuditResult {
    score: number; // 0-100
    weakPasswords: { id: string; title: string; reason: string }[];
    reusedPasswords: { id: string; title: string; count: number }[];
    total: number;
}

export const auditVault = (records: PasswordRecord[]): AuditResult => {
    let score = 100;
    const weakPasswords: { id: string; title: string; reason: string }[] = [];
    const passwordCounts: Record<string, string[]> = {}; // password -> [ids]

    // 1. Analyze Passwords
    records.forEach(record => {
        const pwd = record.password;

        // Strength Check
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (pwd.length >= 12) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;

        if (strength < 3) {
            weakPasswords.push({
                id: record.id,
                title: record.title,
                reason: pwd.length < 8 ? 'Too short' : 'Missing complexity (use numbers/symbols)'
            });
            score -= 5;
        }

        // Reuse Check
        if (passwordCounts[pwd]) {
            passwordCounts[pwd].push(record.title);
        } else {
            passwordCounts[pwd] = [record.title];
        }
    });

    // 2. Analyze Reuse
    const reusedPasswords: { id: string; title: string; count: number }[] = [];
    Object.entries(passwordCounts).forEach(([_pwd, titles]) => {
        if (titles.length > 1) {
            score -= (titles.length - 1) * 10;
            // We just list the first occurrence as the "source" or list all?
            // Let's simplified list: Group by password
            reusedPasswords.push({
                id: 'reuse-group', // logic ID
                title: `${titles.length} accounts use the same password: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`,
                count: titles.length
            });
        }
    });

    return {
        score: Math.max(0, score),
        weakPasswords,
        reusedPasswords,
        total: records.length
    };
};
