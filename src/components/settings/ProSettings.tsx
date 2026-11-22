import React from 'react';
import { CreditCard } from 'lucide-react';

interface ProSettingsProps {
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (v: 'monthly' | 'yearly') => void;
  selectedPlan: 'free' | 'pro';
  setSelectedPlan: (v: 'free' | 'pro') => void;
  upgradeGateway: 'apple' | 'google' | 'card' | null;
  setUpgradeGateway: (v: 'apple' | 'google' | 'card' | null) => void;
  ccName: string;
  setCcName: (v: string) => void;
  ccNum: string;
  setCcNum: (v: string) => void;
  ccExp: string;
  setCcExp: (v: string) => void;
  ccCvc: string;
  setCcCvc: (v: string) => void;
  proSuccess: boolean;
  handleCardUpgradeSubmit: (e: React.FormEvent) => void;
}

export default function ProSettings({
  billingCycle, setBillingCycle, selectedPlan, setSelectedPlan,
  upgradeGateway, setUpgradeGateway, ccName, setCcName, ccNum, setCcNum,
  ccExp, setCcExp, ccCvc, setCcCvc, proSuccess, handleCardUpgradeSubmit,
}: ProSettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-[#1a2744] to-[#0f1a2e] border border-white/10 rounded-2xl p-5 space-y-4 text-white">
        <div className="text-center space-y-1">
          <span className="text-[9px] font-extrabold uppercase bg-primary/20 text-on-surface tracking-widest px-3 py-1 rounded-full">Premium</span>
          <h3 className="text-lg font-bold">LBT Pro</h3>
          <p className="text-xs text-white/50">Unlock full analytics & HD uploads</p>
        </div>

        {proSuccess ? (
          <div className="bg-surface-container-low border border-outline-variant text-on-surface p-4 rounded-xl text-center text-xs font-bold">
            Pro activated!
          </div>
        ) : (
          <>
            <div className="flex bg-white/5 p-1 rounded-full text-xs justify-center">
              <button onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full font-bold transition-all ${billingCycle === 'monthly' ? 'bg-primary text-white' : 'text-white/60'}`}>
                Monthly
              </button>
              <button onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${billingCycle === 'yearly' ? 'bg-primary text-white' : 'text-white/60'}`}>
                Yearly <span className="text-[8px] bg-on-surface-variant text-black px-1 rounded">-30%</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div onClick={() => setSelectedPlan('free')}
                className={`rounded-xl p-3 text-left border cursor-pointer transition-all ${selectedPlan === 'free' ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/5 opacity-60'}`}>
                <span className="text-[9px] uppercase text-white/50 font-mono">Free</span>
                <h4 className="text-base font-extrabold mt-1">$0</h4>
              </div>
              <div onClick={() => setSelectedPlan('pro')}
                className={`rounded-xl p-3 text-left border cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'pro' ? 'bg-primary/20 border-primary ring-1 ring-primary/40' : 'bg-white/5 border-white/5 opacity-60'}`}>
                <div className="absolute top-1.5 right-1.5 bg-on-surface-variant text-black text-[7px] font-black px-1.5 py-0.5 rounded">PRO</div>
                <span className="text-[9px] uppercase text-primary font-mono">Premium</span>
                <h4 className="text-base font-extrabold mt-1">{billingCycle === 'monthly' ? '$9.99' : '$79.99'}<span className="text-xs text-white/50 font-normal">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span></h4>
              </div>
            </div>

            {selectedPlan === 'pro' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setUpgradeGateway('apple')}
                    className={`flex-1 p-2 bg-black border border-white/15 rounded-xl text-[11px] font-bold ${upgradeGateway === 'apple' ? 'ring-2 ring-primary' : ''}`}>
                    Apple Pay
                  </button>
                  <button onClick={() => setUpgradeGateway('google')}
                    className={`flex-1 p-2 bg-primary border border-white/15 rounded-xl text-[11px] font-bold ${upgradeGateway === 'google' ? 'ring-2 ring-primary' : ''}`}>
                    Google Pay
                  </button>
                  <button onClick={() => setUpgradeGateway('card')}
                    className={`flex-1 p-2 bg-zinc-800 border border-white/15 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 ${upgradeGateway === 'card' ? 'ring-2 ring-primary' : ''}`}>
                    <CreditCard className="w-3 h-3" /> Card
                  </button>
                </div>

                {(upgradeGateway === 'apple' || upgradeGateway === 'google') && (
                  <div className="bg-surface-container-lowest dark:bg-surface-container text-on-surface rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
                    <p className="text-outline text-center">You'll be redirected to {upgradeGateway === 'apple' ? 'Apple Pay' : 'Google Pay'} to complete payment.</p>
                    <button
                      type="button"
                      onClick={handleCardUpgradeSubmit}
                      className="bg-primary text-white font-extrabold text-[11px] py-2.5 rounded-xl w-full active:scale-95 transition-transform"
                    >
                      Continue with {upgradeGateway === 'apple' ? 'Apple Pay' : 'Google Pay'}
                    </button>
                  </div>
                )}

                {upgradeGateway === 'card' && (
                  <form onSubmit={handleCardUpgradeSubmit} className="bg-surface-container-lowest dark:bg-surface-container text-on-surface rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
                    <input type="text" value={ccName} onChange={(e) => setCcName(e.target.value)} placeholder="Cardholder name" required
                      aria-label="Cardholder name"
                      className="w-full bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-semibold" />
                    <input type="text" value={ccNum} onChange={(e) => setCcNum(e.target.value)} placeholder="Card number" required
                      aria-label="Card number"
                      className="w-full bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-mono" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={ccExp} onChange={(e) => setCcExp(e.target.value)} placeholder="MM/YY" required
                        aria-label="Expiration date"
                        className="bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-mono" />
                      <input type="text" value={ccCvc} onChange={(e) => setCcCvc(e.target.value)} placeholder="CVC" required
                        aria-label="CVC"
                        className="bg-surface-container dark:bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-2 outline-none focus:border-primary text-on-surface font-mono" />
                    </div>
                    <button type="submit" className="bg-primary text-white font-extrabold text-[11px] py-2.5 rounded-xl w-full active:scale-95 transition-transform">
                      Pay {billingCycle === 'monthly' ? '$9.99' : '$79.99'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
