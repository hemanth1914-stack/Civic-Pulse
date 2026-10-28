import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { theme } from '../lib/theme';


interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="w-full py-16 px-6 text-center bg-white rounded-xl border border-slate-200/90 shadow-2xs max-w-lg mx-auto my-6 animate-in fade-in duration-300">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto mb-4 text-slate-500">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={theme.button.primary}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
