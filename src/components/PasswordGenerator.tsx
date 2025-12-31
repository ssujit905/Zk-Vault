import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';

interface PasswordGeneratorProps {
    onSelect: (password: string) => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onSelect }) => {
    const [length, setLength] = useState(16);
    const [useSymbols, setUseSymbols] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useUppercase, setUseUppercase] = useState(true);
    const [generated, setGenerated] = useState('');
    const [copied, setCopied] = useState(false);

    // Character sets
    const CHARS = {
        lower: 'abcdefghijklmnopqrstuvwxyz',
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    };

    const generate = () => {
        let chars = CHARS.lower;
        if (useUppercase) chars += CHARS.upper;
        if (useNumbers) chars += CHARS.numbers;
        if (useSymbols) chars += CHARS.symbols;

        let result = '';
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            result += chars.charAt(array[i] % chars.length);
        }

        setGenerated(result);
    };

    useEffect(() => {
        generate();
    }, [length, useSymbols, useNumbers, useUppercase]);

    const copyAndSelect = () => {
        onSelect(generated);
        navigator.clipboard.writeText(generated);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const calculateStrength = () => {
        let strength = 0;
        if (length >= 12) strength += 1;
        if (length >= 16) strength += 1;
        if (useUppercase) strength += 1;
        if (useNumbers) strength += 1;
        if (useSymbols) strength += 1;
        return strength;
    };

    const strengthColor = () => {
        const s = calculateStrength();
        if (s <= 2) return 'bg-red-500';
        if (s <= 4) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-4">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-medium text-slate-300">Password Generator</h3>
                <div className={`h-2 w-2 rounded-full ${strengthColor()}`} />
            </div>

            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-black/20 rounded-lg px-3 py-2 font-mono text-sm text-white break-all">
                    {generated}
                </div>
                <button
                    onClick={generate}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Regenerate"
                >
                    <RefreshCw size={18} />
                </button>
                <button
                    onClick={copyAndSelect}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Use & Copy"
                >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Length</span>
                        <span>{length}</span>
                    </div>
                    <input
                        type="range"
                        min="8"
                        max="64"
                        value={length}
                        onChange={(e) => setLength(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useUppercase}
                            onChange={(e) => setUseUppercase(e.target.checked)}
                            className="rounded border-white/20 bg-white/10"
                        />
                        A-Z
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useNumbers}
                            onChange={(e) => setUseNumbers(e.target.checked)}
                            className="rounded border-white/20 bg-white/10"
                        />
                        0-9
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useSymbols}
                            onChange={(e) => setUseSymbols(e.target.checked)}
                            className="rounded border-white/20 bg-white/10"
                        />
                        !@#
                    </label>
                </div>
            </div>
        </div>
    );
};
