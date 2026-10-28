import React, { useState } from 'react';
import { X, Copy, Check, Building2, Mail, Sparkles, Send } from 'lucide-react';
import type { CivicAuthority } from '../lib/authorities';
import { theme } from '../lib/theme';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  authority: CivicAuthority;
  emailText: string;
  category: string;
  areaName: string;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  isOpen,
  onClose,
  authority,
  emailText,
  category,
  areaName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <Send className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Municipal Escalation Dispatch
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  <Sparkles className="w-3 h-3 text-slate-500" />
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated legal-civic dispatch for {category} &middot; {areaName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm bg-slate-50/40">
          {/* Authority Info Card */}
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Designated Civic Authority
                </span>
                <span className="font-semibold text-slate-900 text-sm">
                  {authority.authorityName}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
              <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Simulated Routing Address
                </span>
                <span className="font-mono text-xs text-slate-700 font-medium">
                  {authority.simulatedEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Email Content Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Formal Escalation Letter
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Letter Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-white text-slate-800 p-4 rounded-lg font-mono text-xs leading-relaxed whitespace-pre-wrap select-all max-h-72 overflow-y-auto border border-slate-200/90 shadow-2xs">
              {emailText}
            </div>
          </div>

          {/* Demo Simulation Notice */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2 leading-relaxed">
            <span className="text-sm leading-none font-bold">⚠</span>
            <span>
              <strong>Simulated for demo</strong> — in production this is sent automatically by a scheduled job after the real 3-4 day window.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={theme.button.primary}
          >
            Close Dispatch
          </button>
        </div>
      </div>
    </div>
  );
};

export default EscalationModal;
