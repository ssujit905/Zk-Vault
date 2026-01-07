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
            cta: 'Get Family Plan',
            icon: Users,
            color: 'primary'
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Choose Your Security Tier</h2>
                <p className="text-slate-400">Secure your digital life with zero-knowledge encryption. Upgrade anytime to unlock advanced protection and seamless sharing.</p>
            </div>

            <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative glass-card p-6 flex flex-col md:flex-row items-center gap-8 transition-all duration-300 ${tier === plan.id ? `ring-2 ring-${plan.color === 'primary' ? 'primary-500' : plan.color === 'amber' ? 'amber-500' : 'slate-500'}` :
                            'hover:border-white/20'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 right-8 -translate-y-1/2 bg-amber-500 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg z-20">
                                Recommended
                            </div>
                        )}

                        {/* Plan Header & Identity */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-[180px]">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${plan.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                plan.color === 'primary' ? 'bg-primary-500/10 text-primary-400' :
                                    'bg-slate-500/10 text-slate-400'
                                }`}>
                                <plan.icon size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-white">{plan.price}</span>
                                {plan.period && <span className="text-slate-500 font-medium text-xs">{plan.period}</span>}
                            </div>
                        </div>

                        {/* Plan Features Checklist */}
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {plan.features.map((feature, i) => (
                                <div key={i} className="flex gap-2 text-[11px] items-center">
                                    <Check size={12} className={plan.color === 'amber' ? 'text-amber-500' : plan.color === 'primary' ? 'text-primary-400' : 'text-slate-500'} />
                                    <span className="text-slate-400 font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Action / CTA */}
                        <div className="w-full md:w-48 flex flex-col gap-2">
                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={tier === plan.id || processing !== null}
                                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${tier === plan.id
                                    ? 'bg-white/5 text-slate-500 cursor-default border border-white/5'
                                    : plan.color === 'amber'
                                        ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.2)] active:scale-95'
                                        : plan.color === 'primary'
                                            ? 'bg-primary-500 text-white hover:bg-primary-400 shadow-[0_4px_20px_rgba(14,165,233,0.2)] active:scale-95'
                                            : 'bg-white/10 text-white hover:bg-white/20 active:scale-95 text-[10px]'
                                    }`}
                            >
                                {processing === plan.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    tier === plan.id ? 'Active' : plan.cta
                                )}
                            </button>
                            {plan.id !== 'free' && tier === 'free' && (
                                <span className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest">Instant Activation</span>
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
