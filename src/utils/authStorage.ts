const TOKEN_KEY = 'al_ashbiliya_auth_token';
const SESSION_EXPIRED_KEY = 'al_ashbiliya_session_expired';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const markSessionExpired = (): void => {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
};

export const hasSessionExpired = (): boolean => {
  return sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
};

export const clearSessionExpired = (): void => {
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
};
