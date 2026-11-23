import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/45 backdrop-blur-[2px] no-print">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-sky-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/80 to-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-sky-100/70 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-sky-100 bg-slate-50/80 flex items-center justify-end gap-2.5 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
