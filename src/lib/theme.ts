/**
 * CivicPulse Design System Tokens
 * Enterprise-grade civic tech aesthetic inspired by Stripe, Vercel, and USWDS.
 */

export const theme = {
  // Brand & Surface
  brand: {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
    primaryBorder: 'border-slate-900',
    primaryText: 'text-slate-900',
  },
  surface: {
    app: 'bg-slate-50 min-h-screen text-slate-900',
    card: 'bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all duration-200',
    cardHover: 'hover:shadow-sm hover:border-slate-300',
    modal: 'bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden',
    subtle: 'bg-slate-50/70 border border-slate-100',
  },

  // Semantic Status Badges
  status: {
    reported:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80',
    escalated:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/90',
    resolved:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90',
    critical:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/90',
  },

  // Buttons & Interactions
  button: {
    primary:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
    secondary:
      'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
    ghost:
      'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
    escalate:
      'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
  },

  // Form Inputs
  input: {
    base: 'w-full px-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-300 transition-all duration-200 text-sm focus-visible:outline-none focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900',
    label: 'block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5',
    helper: 'text-xs text-slate-500 mt-1',
  },

  // Navigation Tabs
  tabs: {
    container: 'flex items-center gap-6 border-b border-slate-200 overflow-x-auto',
    active:
      'relative py-3.5 px-1 font-semibold text-sm text-slate-900 border-b-2 border-slate-900 transition-all duration-200 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-t-sm',
    inactive:
      'relative py-3.5 px-1 font-medium text-sm text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-all duration-200 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-t-sm',
  },
};
