const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// 1. Add Lock import
content = content.replace(
  "FileText, FileCheck, UserMinus, Trash2, Check, Repeat2, Type, Languages, Globe\n} from 'lucide-react';",
  "FileText, FileCheck, UserMinus, Trash2, Check, Repeat2, Type, Languages, Globe, Lock\n} from 'lucide-react';"
);

// 2. Update activeSubpage type
content = content.replace(
  "const [activeSubpage, setActiveSubpage] = useState<'personal' | 'security' | 'notifications' | 'faq' | 'about' | 'pro' | 'privacy' | 'appearance' | 'media' | null>(null);",
  "const [activeSubpage, setActiveSubpage] = useState<'security' | 'notifications' | 'faq' | 'about' | 'privacy' | 'appearance' | 'media' | 'blocked' | null>(null);"
);

// 3. Update subpage title mapping
content = content.replace(
`            <h2 className="text-sm font-bold text-on-surface">
              {activeSubpage === 'personal' && 'Personal Information'}
              {activeSubpage === 'security' && 'Security & Password'}
              {activeSubpage === 'notifications' && 'Notifications'}
              {activeSubpage === 'faq' && 'Help Center'}
              {activeSubpage === 'about' && 'About LBT'}
              {activeSubpage === 'pro' && 'LBT Pro'}
              {activeSubpage === 'privacy' && 'Privacy Settings'}
              {activeSubpage === 'appearance' && 'Appearance'}
              {activeSubpage === 'media' && 'Media & Data'}
            </h2>`,
`            <h2 className="text-sm font-bold text-on-surface">
              {activeSubpage === 'security' && 'Security & Password'}
              {activeSubpage === 'notifications' && 'Notifications'}
              {activeSubpage === 'faq' && 'Help Center'}
              {activeSubpage === 'about' && 'About LBT'}
              {activeSubpage === 'privacy' && 'Privacy Settings'}
              {activeSubpage === 'appearance' && 'Appearance'}
              {activeSubpage === 'media' && 'Media & Data'}
              {activeSubpage === 'blocked' && 'Blocked Accounts'}
            </h2>`
);

// 4. Replace PERSONAL section with BLOCKED section
const personalSection = `        {/* PERSONAL */}
        {activeSubpage === 'personal' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              {/* Avatar row */}
              <div className="p-4 flex items-center gap-4 border-b border-outline-variant/10">
                <img src={editPic || undefined} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" alt="" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-on-surface">{editName || 'Your Name'}</p>
                  <p className="text-[10px] text-outline">@{editUsername}</p>
                </div>
                <button
                  onClick={() => {
                    setEditPic(null);
                  }}
                  className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
                >
                  Change
                </button>
              </div>

              {saveFeedback && (
                <div className={\`mx-4 mt-3 p-3 rounded-xl text-xs font-bold \${saveFeedback.startsWith('!') ? 'bg-error/10 text-error' : 'bg-surface-container-low text-on-surface'}\`}>
                  {saveFeedback}
                </div>
              )}

              <div className="p-4 space-y-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Full Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/30 border border-outline-variant/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">@</span>
                    <input type="text" value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9__-]/g, ''))}
                      className={\`w-full bg-surface-container rounded-xl pl-7 pr-4 py-2.5 text-xs text-on-surface outline-none border \${isUsernameTaken ? 'border-error' : 'border-outline-variant/20 focus:ring-1 focus:ring-primary/30'}\`} />
                  </div>
                  <p className={\`text-[10px] font-bold \${isUsernameTaken ? 'text-error' : 'text-on-surface'}\`}>
                    {isUsernameTaken ? 'Username taken' : 'Available'}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Bio</label>
                  <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3}
                    className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/30 border border-outline-variant/20 resize-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Email</label>
                  <div className="flex gap-2">
                    <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setIsEmailVerified(false); }}
                      className="flex-1 bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20" />
                    {isEmailVerified ? (
                      <span className="bg-surface-container-low text-on-surface text-[10px] font-bold px-3 py-2.5 rounded-xl flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <button onClick={handleDemoVerifyEmail} disabled={isEmailVerifying}
                        className="bg-primary text-white text-[10px] font-bold px-3 py-2.5 rounded-xl disabled:opacity-50">
                        {isEmailVerifying ? '...' : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Phone</label>
                  <div className="flex gap-2">
                    <select value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)}
                      className="bg-surface-container border border-outline-variant/20 rounded-xl px-2.5 py-2.5 text-xs font-bold outline-none shrink-0"
                      aria-label="Phone prefix">
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+213">🇩🇿 +213</option>
                    </select>
                    <input type="text" value={phoneNum} onChange={(e) => setPhoneNum(e.target.value)}
                      className="flex-1 bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20 font-mono"
                      aria-label="Phone number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Date of Birth</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none border border-outline-variant/20">
                      <option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button onClick={handleSavePersonalInfo}
                  className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl active:scale-98 transition-transform">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY */}`;
const blockedSection = `        {/* BLOCKED ACCOUNTS */}
        {activeSubpage === 'blocked' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10">
                <h3 className="text-xs font-bold text-on-surface">Blocked Accounts</h3>
                <p className="text-[10px] text-outline mt-0.5">These accounts can't see your profile or contact you</p>
              </div>
              <div className="p-4">
                <div id="blocked-list" className="space-y-3">
                  <p className="text-xs text-on-surface-variant text-center py-8">Loading blocked accounts...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY */}`;

content = content.replace(personalSection, blockedSection);

// 5. Remove PRO section
const proSection = `        )}

        {/* PRO */}
        {activeSubpage === 'pro' && (
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
                      className={\`px-4 py-1.5 rounded-full font-bold transition-all \${billingCycle === 'monthly' ? 'bg-primary text-white' : 'text-white/60'}\`}>
                      Monthly
                    </button>
                    <button onClick={() => setBillingCycle('yearly')}
                      className={\`px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 \${billingCycle === 'yearly' ? 'bg-primary text-white' : 'text-white/60'}\`}>
                      Yearly <span className="text-[8px] bg-on-surface-variant text-black px-1 rounded">-30%</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div onClick={() => setSelectedPlan('free')}
                      className={\`rounded-xl p-3 text-left border cursor-pointer transition-all \${selectedPlan === 'free' ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/5 opacity-60'}\`}>
                      <span className="text-[9px] uppercase text-white/50 font-mono">Free</span>
                      <h4 className="text-base font-extrabold mt-1">$0</h4>
                    </div>
                    <div onClick={() => setSelectedPlan('pro')}
                      className={\`rounded-xl p-3 text-left border cursor-pointer transition-all relative overflow-hidden \${selectedPlan === 'pro' ? 'bg-primary/20 border-primary ring-1 ring-primary/40' : 'bg-white/5 border-white/5 opacity-60'}\`}>
                      <div className="absolute top-1.5 right-1.5 bg-on-surface-variant text-black text-[7px] font-black px-1.5 py-0.5 rounded">PRO</div>
                      <span className="text-[9px] uppercase text-primary font-mono">Premium</span>
                      <h4 className="text-base font-extrabold mt-1">{\${billingCycle === 'monthly' ? '$9.99' : '$79.99'}<span className="text-xs text-white/50 font-normal">/\${billingCycle === 'monthly' ? 'mo' : 'yr'}</span></h4>
                    </div>
                  </div>

                  {selectedPlan === 'pro' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button onClick={() => { setUpgradeGateway('apple'); setCcName('Jessica Thompson'); setCcNum('4532 9900'); }}
                          className={\`flex-1 p-2 bg-black border border-white/15 rounded-xl text-[11px] font-bold \${upgradeGateway === 'apple' ? 'ring-2 ring-primary' : ''}\`}>
                          Apple Pay
                        </button>
                        <button onClick={() => { setUpgradeGateway('google'); setCcName('Jessica Thompson'); setCcNum('8812 0032'); }}
                          className={\`flex-1 p-2 bg-primary border border-white/15 rounded-xl text-[11px] font-bold \${upgradeGateway === 'google' ? 'ring-2 ring-primary' : ''}\`}>
                          Google Pay
                        </button>
                        <button onClick={() => setUpgradeGateway('card')}
                          className={\`flex-1 p-2 bg-zinc-800 border border-white/15 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 \${upgradeGateway === 'card' ? 'ring-2 ring-primary' : ''}\`}>
                          <CreditCard className="w-3 h-3" /> Card
                        </button>
                      </div>

                      {upgradeGateway && (
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
                            Pay \${billingCycle === 'monthly' ? '$9.99' : '$79.99'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* PRIVACY */}`;
const replacement = `        )}

        {/* PRIVACY */}`;

content = content.replace(proSection, replacement);

fs.writeFileSync('src/pages/SettingsPage.tsx', content);
console.log('Done!');