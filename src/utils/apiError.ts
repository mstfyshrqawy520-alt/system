import { AxiosError } from 'axios';
import { ApiError } from '../types/api';

const hasArabicText = (value: string): boolean => /[\u0600-\u06FF]/.test(value);

const translateMessage = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const message = value.trim();
  const arabicTranslations: Array<[string, string]> = [
    ['بيانات الدخول غير صحيحة', 'البريد الإلكتروني أو كلمة المرور غير صحيحين. تأكد من البيانات المستخدمة لحسابك ثم حاول مرة أخرى.'],
    ['انتهت جلسة الدخول', 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.'],
    ['ليس لديك صلاحية', 'لا تملك الصلاحية المطلوبة لتنفيذ هذا الإجراء. إذا كان ذلك غير متوقع، تواصل مع مدير النظام.'],
    ['لا يمكن للمراجع تعديل الطلب بعد اعتماد مدير المشتريات', 'تم اعتماد الطلب من مدير المشتريات، لذلك تم قفل التعديل نهائيًا. يمكنك فتح الطلب للعرض فقط.'],
  ];
  const arabicTranslation = arabicTranslations.find(([fragment]) => message.includes(fragment));
  if (arabicTranslation) {
    return arabicTranslation[1];
  }

  if (hasArabicText(message)) {
    return message;
  }

  const normalized = message.toLowerCase();
  const knownTranslations: Array<[string, string]> = [
    ['network error', 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.'],
    ['timeout', 'استغرق الاتصال وقتًا أطول من المتوقع. حاول مرة أخرى.'],
    ['request failed with status code 401', 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.'],
    ['request failed with status code 403', 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'],
    ['request failed with status code 404', 'العنصر المطلوب غير موجود أو لم يعد متاحًا.'],
    ['request failed with status code 409', 'لا يمكن تنفيذ الإجراء الحالي بسبب تعارض في حالة الطلب.'],
    ['request failed with status code 422', 'بعض البيانات غير مكتملة أو غير صحيحة. راجع الحقول المعلّمة ثم حاول مرة أخرى.'],
    ['unauthenticated', 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.'],
    ['please log in again', 'سجّل الدخول مرة أخرى للمتابعة.'],
    ['unauthorized', 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'],
    ['forbidden', 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'],
    ['not found', 'العنصر المطلوب غير موجود أو لم يعد متاحًا.'],
    ['conflict error', 'لا يمكن تنفيذ الإجراء الحالي بسبب تعارض في حالة الطلب.'],
    ['validation failed', 'يرجى مراجعة البيانات المدخلة وتصحيح الحقول المطلوبة.'],
    ['server error', 'حدث خطأ مؤقت في الخادم. يرجى المحاولة مرة أخرى بعد قليل.'],
    ['an unexpected error occurred', 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'],
    ['an unknown error occurred', 'حدث خطأ غير معروف. يرجى المحاولة مرة أخرى.'],
  ];

  const matchingTranslation = knownTranslations.find(([fragment]) => normalized.includes(fragment));
  return matchingTranslation?.[1] || fallback;
};

const translateFieldErrors = (errors: unknown): Record<string, string[]> | undefined => {
  if (!errors || typeof errors !== 'object') {
    return undefined;
  }

  return Object.entries(errors as Record<string, unknown>).reduce<Record<string, string[]>>((result, [field, messages]) => {
    const values = Array.isArray(messages) ? messages : [messages];
    result[field] = values.map((message) => translateMessage(message, 'يرجى مراجعة هذا الحقل.'));
    return result;
  }, {});
};

export const parseApiError = (error: unknown): ApiError => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<Record<string, unknown>>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const isLoginRequest = axiosError.config?.url?.includes('/auth/login') ?? false;
    const responseErrors = translateFieldErrors(responseData?.errors);

    let fallback = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
    if (status === 401) {
      fallback = isLoginRequest
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحين. تأكد من البيانات المستخدمة لحسابك ثم حاول مرة أخرى.'
        : 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.';
    } else if (status === 403) {
      fallback = 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
    } else if (status === 404) {
      fallback = 'العنصر المطلوب غير موجود أو لم يعد متاحًا.';
    } else if (status === 409) {
      fallback = 'لا يمكن تنفيذ الإجراء الحالي بسبب تعارض في حالة الطلب.';
    } else if (status === 422) {
      fallback = 'بعض البيانات غير مكتملة أو غير صحيحة. راجع الحقول المعلّمة ثم حاول مرة أخرى.';
    } else if (status && status >= 500) {
      fallback = 'حدث خطأ مؤقت في الخادم. يرجى المحاولة مرة أخرى بعد قليل.';
    } else if (!axiosError.response && axiosError.code === 'ECONNABORTED') {
      fallback = 'استغرق الاتصال وقتًا أطول من المتوقع. حاول مرة أخرى.';
    } else if (!axiosError.response) {
      fallback = 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
    }

    const message = translateMessage(responseData?.message, fallback);

    return {
      message,
      errors: responseErrors,
      status,
    };
  }

  if (error instanceof Error) {
    return {
      message: translateMessage(error.message, 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'),
    };
  }

  return {
    message: 'حدث خطأ غير معروف. يرجى المحاولة مرة أخرى.',
  };
};
