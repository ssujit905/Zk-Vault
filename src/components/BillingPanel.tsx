import React, { useState } from 'react';
import { Crown, Check, Users, Shield, Heart, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analytics';

export const BillingPanel: React.FC = () => {
    const { tier, setTier } = useAuth();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleUpgrade = async (planId: string) => {
        if (planId === tier) return;

        setProcessing(planId);
        analyticsService.trackEvent('checkout_started', { plan: planId });

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        await setTier(planId as any);
        analyticsService.trackEvent('checkout_completed', { plan: planId });
        setProcessing(null);

        alert(`Successfully upgraded to Zk Vault ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);
    };

    const plans = [
        {
            id: 'free',
            name: 'Zk Vault Free',
            price: '$0',
            description: 'Essential security for everyone.',
            features: [
                'Unlimited Logins & Passwords',
                'Manual ZK Backup & Restore',
                'Panic Lock / Hotkey',
                'Manual Autofill Support',
                'Basic Status Dashboard',
                'Advanced SPA Autofill (3 sites/mo)'
            ],
            cta: 'Current Plan',
            icon: Shield,
            color: 'slate'
        },
        {
            id: 'pro',
            name: 'Zk Vault Pro',
            price: '$2.99',
            period: '/mo',
            description: 'Advanced power for security professionals.',
            features: [
                'Identity & Card Management',
                'Password Audit & Breach Scan',
                'Unlimited Shadow DOM Autofill',
                'Custom Labels & Icons',
                'Visual ZK Handshake Animation',
                'Live Activity Stream',
                'Priority Recovery Support'
            ],
            cta: 'Upgrade to Pro',
            icon: Crown,
            color: 'amber',
            popular: true
        },
        {
            id: 'family',
            name: 'Family & Teams',
            price: '$4.99',
            period: '/mo',
            description: 'Collaborative security for your inner circle.',
            features: [
                'Everything in Pro Plan',
                'ZK Encrypted Vault Sharing',
                'Emergency Contacts / Heir Access',
                'Up to 5 Multi-User Licenses',
                'Admin Management Console',
                'Priority Family Support'
            ],
            cta: 'Coming Soon',
            icon: Users,
            color: 'primary',
            comingSoon: true
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Choose Your Security Tier</h2>
                <p className="text-slate-400">Secure your digital life with zero-knowledge encryption. Upgrade anytime to unlock advanced protection and seamless sharing.</p>
            </div>

            <div className="flex flex-col gap-6 max-w-xl mx-auto">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative glass-card p-8 flex flex-col items-center text-center transition-all duration-300 ${tier === plan.id ? `ring-2 ring-${plan.color === 'primary' ? 'primary-500' : plan.color === 'amber' ? 'amber-500' : 'slate-500'}` :
                            'hover:border-white/20'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg z-20">
                                Recommended
                            </div>
                        )}

                        {/* Plan Header & Identity */}
                        <div className="mb-8">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 ${plan.color === 'amber' ? 'bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
                                plan.color === 'primary' ? 'bg-primary-500/10 text-primary-400 shadow-[0_0_20px_rgba(14,165,233,0.1)]' :
                                    'bg-slate-500/10 text-slate-400'
                                }`}>
                                <plan.icon size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{plan.name}</h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-black text-white tracking-tighter">{plan.price}</span>
                                {plan.period && <span className="text-slate-500 font-bold text-sm">{plan.period}</span>}
                            </div>
                            <p className="mt-4 text-slate-400 text-xs font-medium max-w-xs leading-relaxed">
                                {plan.description}
                            </p>
                        </div>

                        {/* Plan Features Checklist - STRICTLY VERTICAL */}
                        <div className="w-full max-w-xs mb-10 space-y-3.5 border-y border-white/5 py-8">
                            {plan.features.map((feature, i) => (
                                <div key={i} className="flex gap-3 text-xs items-center justify-start px-4">
                                    <div className="flex-shrink-0">
                                        <Check size={14} className={plan.color === 'amber' ? 'text-amber-500' : plan.color === 'primary' ? 'text-primary-400' : 'text-slate-500'} />
                                    </div>
                                    <span className="text-slate-300 font-medium tracking-wide">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Action / CTA */}
                        <div className="w-full max-w-xs flex flex-col gap-3">
                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={tier === plan.id || processing !== null || (plan as any).comingSoon}
                                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${tier === plan.id || (plan as any).comingSoon
                                    ? 'bg-white/5 text-slate-500 cursor-default border border-white/5'
                                    : plan.color === 'amber'
                                        ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_8px_25px_rgba(245,158,11,0.25)] active:scale-95'
                                        : plan.color === 'primary'
                                            ? 'bg-primary-500 text-white hover:bg-primary-400 shadow-[0_8px_25_rgba(14,165,233,0.25)] active:scale-95'
                                            : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
                                    }`}
                            >
                                {processing === plan.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    tier === plan.id ? 'Current Plan' : (plan as any).comingSoon ? 'Coming Soon' : plan.cta
                                )}
                            </button>
                            {plan.id !== 'free' && tier === 'free' && (
                                <span className="text-[10px] text-center text-slate-500 font-black uppercase tracking-[0.15em] opacity-60">
                                    Instant Global Activation
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Shield size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Secure Payments via Stripe</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Heart size={16} className="text-red-500/50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">30-Day Money Back</span>
                    </div>
                </div>
                <p className="text-[10px] max-w-sm md:text-right">
                    Family plan includes 5 individual vaults. Emergency access allows designated heirs to request vault access after a pre-set cooling period.
                </p>
            </div>
        </div>
    );
};
