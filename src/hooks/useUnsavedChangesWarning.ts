import { useEffect } from 'react';

const DEFAULT_MESSAGE = 'لديك تعديلات غير محفوظة. هل تريد مغادرة الصفحة وفقد هذه التعديلات؟';

/**
 * يحمي نماذج الإدخال من فقدان البيانات عند تحديث الصفحة أو إغلاق التبويب.
 * لا يمنع أي انتقال في الـWorkflow ولا يرسل بيانات إلى الخادم.
 */
export const useUnsavedChangesWarning = (isDirty: boolean, message = DEFAULT_MESSAGE): void => {
  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);
};

export default useUnsavedChangesWarning;
