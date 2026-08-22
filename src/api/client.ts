import axios from 'axios';
import { getToken, markSessionExpired, removeToken } from '../utils/authStorage';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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
