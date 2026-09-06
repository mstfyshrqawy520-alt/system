import React, { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if user already in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_DURATION_MS) return;
      localStorage.removeItem(DISMISSED_KEY);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      setDeferredPrompt(evt);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      promptRef.current = null;
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = promptRef.current;
    if (!prompt) return;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setTimeout(() => {
          setAnimateOut(true);
          setTimeout(() => setShowBanner(false), 500);
        }, 2000);
      }
    } catch {
      // User cancelled or error
    }
    promptRef.current = null;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setAnimateOut(true);
    setTimeout(() => setShowBanner(false), 500);
  };

  if (!showBanner && !installed) return null;

  // Show success toast after install
  if (installed && !showBanner) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-[slideUp_0.4s_ease-out]">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-700/60 bg-emerald-950/95 px-5 py-3 text-sm font-bold text-emerald-300 shadow-2xl backdrop-blur-xl">
          <span className="text-xl">✅</span>
          <span>تم تثبيت نظام المشتريات بنجاح!</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-md transition-all duration-500 ${
        animateOut ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-[slideUp_0.5s_ease-out]'
      }`}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-cyan-700/50 bg-gradient-to-br from-slate-900/98 to-slate-800/98 p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl"
        dir="rtl"
      >
        {/* Glow effect */}
        <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-amber-500/8 blur-2xl" />

        <div className="relative flex items-center gap-3">
          {/* App Icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-inner">
            <img
              src="/icon-192x192.png"
              alt="نظام المشتريات"
              className="h-10 w-10 rounded-lg object-contain"
            />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-100 leading-tight">
              تثبيت نظام المشتريات
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
              أضف التطبيق إلى الشاشة الرئيسية للوصول السريع والإشعارات الفورية
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-1 left-1 flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 transition-all text-xs"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Action buttons */}
        <div className="relative mt-3 flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-cyan-950/40 transition-all hover:shadow-xl hover:shadow-cyan-900/50 active:scale-[0.97] hover:from-cyan-500 hover:to-blue-500"
          >
            <span className="text-base">📲</span>
            <span>تثبيت الآن</span>
          </button>

          <button
            onClick={handleDismiss}
            className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-2.5 text-xs font-bold text-slate-400 transition-all hover:bg-slate-700/60 hover:text-slate-300 active:scale-[0.97]"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
