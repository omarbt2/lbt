import React from 'react';
import {
  Search, ChevronDown, ChevronUp
} from 'lucide-react';

interface FaqSettingsProps {
  faqSearch: string;
  setFaqSearch: (v: string) => void;
  faqCategory: 'all' | 'account' | 'privacy' | 'pro';
  setFaqCategory: (v: 'all' | 'account' | 'privacy' | 'pro') => void;
  expandedFaq: number | null;
  setExpandedFaq: (v: number | null) => void;
  ticketSubject: string;
  setTicketSubject: (v: string) => void;
  ticketDesc: string;
  setTicketDesc: (v: string) => void;
  ticketStatus: 'idle' | 'sending' | 'success';
  ticketReference: string | null;
  ticketHistory: { id: string; subject: string; status: string; created_at: string }[];
  ticketsLoading: boolean;
  handleSubmitTicket: (e: React.FormEvent) => void;
}

const FAQS = [
  { id: 1, cat: 'pro' as const, q: 'How do I upgrade to LBT Premium Pro?', a: 'LBT Pro subscriptions and payments are not available yet. No payment will be taken in this version.' },
  { id: 2, cat: 'privacy' as const, q: 'How is my account data protected?', a: 'LBT uses Supabase authentication and database access policies. Review the Privacy Policy for the data practices that apply to your account.' },
  { id: 3, cat: 'account' as const, q: 'How do I change my username?', a: 'Go to Settings > Personal Information. Enter any non-taken username.' },
  { id: 4, cat: 'privacy' as const, q: 'Does LBT support two-factor authentication?', a: 'Two-factor authentication is not configured in this version. The Security page will not show inactive SMS or authenticator switches as if they were protecting your account.' },
  { id: 5, cat: 'pro' as const, q: 'Are premium insights available?', a: 'Premium subscription features are not active yet. Existing account insights remain available where supported.' }
];

export default function FaqSettings({
  faqSearch, setFaqSearch, faqCategory, setFaqCategory, expandedFaq, setExpandedFaq,
  ticketSubject, setTicketSubject, ticketDesc, setTicketDesc, ticketStatus, handleSubmitTicket,
}: FaqSettingsProps) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input type="text" value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)}
            placeholder="Search help articles..."
            aria-label="Search help articles"
            className="w-full bg-surface-container rounded-full pl-9 pr-4 py-2.5 text-xs outline-none border border-outline-variant/20" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'account', 'privacy', 'pro'] as const).map(cat => (
            <button key={cat} onClick={() => setFaqCategory(cat)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full capitalize transition-all ${faqCategory === cat ? 'bg-primary text-white' : 'bg-surface-container text-outline hover:text-on-surface'}`}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {FAQS.filter(f => (faqCategory === 'all' || f.cat === faqCategory) &&
            (f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))
          ).map(faq => (
            <div key={faq.id} className="border border-outline-variant/20 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="w-full p-3 flex justify-between items-center text-left hover:bg-surface-container/30 transition-colors">
                <span className="text-xs font-bold text-on-surface pr-2">{faq.q}</span>
                {expandedFaq === faq.id ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-outline shrink-0" />}
              </button>
              {expandedFaq === faq.id && (
                <div className="px-4 pb-3 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/10 pt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
          {FAQS.filter(f => (faqCategory === 'all' || f.cat === faqCategory) && (f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))).length === 0 && (
            <p className="rounded-xl bg-surface-container-low p-4 text-center text-xs text-on-surface-variant">No help articles match that search.</p>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
        <h3 className="text-xs font-bold text-on-surface">Contact Support</h3>
        {ticketStatus === 'success' ? (
          <div className="bg-surface-container-low text-on-surface border border-outline-variant p-3 rounded-xl text-xs font-bold text-center">
            Ticket submitted successfully. Reference: {ticketReference || 'Saved'}
          </div>
        ) : (
          <form onSubmit={handleSubmitTicket} className="space-y-2">
            <input type="text" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="Subject" required
              aria-label="Support ticket subject"
              className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20" />
            <textarea value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)}
              placeholder="Describe your issue..." required rows={3}
              aria-label="Support ticket description"
              className="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs outline-none border border-outline-variant/20 resize-none" />
            <button type="submit" disabled={ticketStatus === 'sending'}
              className="bg-primary text-white font-bold text-xs py-2.5 rounded-xl disabled:opacity-50 w-full">
              {ticketStatus === 'sending' ? 'Sending...' : 'Submit Ticket'}
            </button>
          </form>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-3">
        <h3 className="text-xs font-bold text-on-surface">Your support requests</h3>
        {ticketsLoading ? (
          <p className="text-xs text-outline">Loading your requests…</p>
        ) : ticketHistory.length === 0 ? (
          <p className="text-xs text-outline">You have not submitted any support requests yet.</p>
        ) : (
          <div className="space-y-2">
            {ticketHistory.map(ticket => (
              <div key={ticket.id} className="rounded-xl border border-outline-variant/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-on-surface">{ticket.subject}</p>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold capitalize text-primary">{ticket.status.replace('_', ' ')}</span>
                </div>
                <p className="mt-1 text-[10px] text-outline">#{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
