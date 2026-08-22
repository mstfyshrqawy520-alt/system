import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import {
  getPushPermissionState,
  getPushSupportStatus,
  requestAndRegisterPushToken,
  PushPermissionState,
} from '../../services/pushNotificationService';

interface PushNotificationPromptProps {
  variant?: 'banner' | 'card' | 'compact';
  onEnabled?: () => void;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  variant = 'banner',
  onEnabled,
}) => {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(getPushSupportStatus());
    setPermission(getPushPermissionState());
  }, []);

  if (!isSupported) {
    return null;
  }

  if (permission === 'granted' && !message) {
    if (variant === 'compact') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-800/60">
          <span>🔔</span>
          <span>الإشعارات الفورية مفعّلة على هذا الجهاز</span>
        </span>
      );
    }
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs text-slate-400 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-base">⚠️</span>
          <span>تم تعطيل إشعارات المتصفح من إعدادات جهازك. يمكنك تفعيلها من إعدادات المتصفح لتصلك التنبيهات الفورية.</span>
        </div>
      </div>
    );
  }

  const handleEnablePush = async () => {
    setLoading(true);
    setMessage(null);
    setIsSuccess(false);
    try {
      const result = await requestAndRegisterPushToken();
      if (result.success) {
        setPermission('granted');
        setIsSuccess(true);
        setMessage('تم تفعيل الإشعارات الفورية بنجاح! ستصلك التنبيهات حتى عند إغلاق التطبيق.');
        if (onEnabled) onEnabled();
      } else {
        setIsSuccess(false);
        setMessage(result.error || 'تعذر تفعيل الإشعارات.');
      }
    } catch {
      setIsSuccess(false);
      setMessage('حدث خطأ أثناء تفعيل الإشعارات.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          className="font-bold flex items-center gap-1.5 text-xs"
          isLoading={loading}
          onClick={handleEnablePush}
        >
          <span>🔔</span>
          <span>تفعيل الإشعارات على الجوال</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-800/70 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-xl text-cyan-300 border border-cyan-500/30">
            🔔
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-100">تفعيل إشعارات الجوال والكمبيوتر الفورية (Web Push)</h4>
            <p className="mt-0.5 text-xs text-slate-400 leading-5">
              احصل على إشعار فوري على هاتفك أو حاسوبك عند وصول طلب جديد، اعتماد أمر شراء، أو صدور فاتورة حتى والتطبيق مغلق.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            className="w-full sm:w-auto font-bold shadow-md text-xs px-4 py-2"
            isLoading={loading}
            onClick={handleEnablePush}
          >
            تفعيل الإشعارات الآن
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-2.5 text-xs font-bold ${
          isSuccess ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default PushNotificationPrompt;
