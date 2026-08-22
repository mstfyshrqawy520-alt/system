import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  const modal = (
    <div
      className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4 backdrop-blur-sm"
      dir="rtl"
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`relative flex min-h-0 w-full ${sizeClasses[size]} max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-2 sm:gap-4 border-b border-slate-700 bg-slate-900 px-3 py-3 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base sm:text-lg font-bold text-slate-100 break-words">{title}</h3>
            {subtitle && <p id={descriptionId} className="mt-1.5 text-xs leading-5 text-slate-400">{subtitle}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:border-cyan-500/60 hover:bg-slate-700 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6 text-slate-200">
          {children}
        </div>

        {footer && (
          <footer className="flex shrink-0 flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-slate-700 bg-slate-900 px-3 py-3 sm:px-6 sm:py-4 [&>button]:w-full sm:[&>button]:w-auto">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
};
