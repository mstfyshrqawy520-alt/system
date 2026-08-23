import axios, { AxiosRequestConfig } from 'axios';
import { getToken, markSessionExpired, removeToken } from '../utils/authStorage';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

type CachedGetEntry = {
  expiresAt: number;
  value: unknown;
};

const cachedGets = new Map<string, CachedGetEntry>();
const pendingGets = new Map<string, Promise<unknown>>();

const getCacheKey = (url: string, config?: AxiosRequestConfig) => {
  const token = getToken();
  const authScope = token ? token.slice(-12) : 'guest';
  return `${authScope}:${url}:${JSON.stringify(config?.params ?? {})}`;
};

/**
 * Short-lived, session-scoped GET cache for reference data. Mutations should
 * call invalidateCachedGet with the related URL prefix after they succeed.
 */
export const cachedGetData = async <T>(url: string, config?: AxiosRequestConfig, ttlMs = 15000): Promise<T> => {
  const key = getCacheKey(url, config);
  const now = Date.now();
  const cached = cachedGets.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const pending = pendingGets.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = apiClient.get<T>(url, config)
    .then((response) => {
      cachedGets.set(key, { value: response.data, expiresAt: Date.now() + ttlMs });
      return response.data;
    })
    .finally(() => {
      pendingGets.delete(key);
    });

  pendingGets.set(key, request);
  return request;
};

export const invalidateCachedGet = (urlPrefix?: string) => {
  if (!urlPrefix) {
    cachedGets.clear();
    return;
  }

  for (const key of cachedGets.keys()) {
    if (key.includes(`:${urlPrefix}:`)) {
      cachedGets.delete(key);
    }
  }
};

// Request Interceptor: Attach Sanctum Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & 403 status codes
let onUnauthenticatedCallback: (() => void) | null = null;

export const setOnUnauthenticated = (callback: () => void) => {
  onUnauthenticatedCallback = callback;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      markSessionExpired();
      removeToken();
      if (!getToken() && onUnauthenticatedCallback) {
        onUnauthenticatedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
