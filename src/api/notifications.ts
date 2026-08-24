import apiClient from './client';
import { Notification } from '../types/notification';
import { getToken } from '../utils/authStorage';

export const getNotificationsApi = async (): Promise<Notification[]> => {
  const response = await apiClient.get<{ data: Notification[] }>('/notifications');
  return response.data.data;
};

export const getUnreadNotificationCountApi = async (): Promise<number> => {
  const response = await apiClient.get<{ unread_count?: number; count?: number }>('/notifications/unread-count');
  return response.data.unread_count ?? response.data.count ?? 0;
};

export const getUnreadCountApi = getUnreadNotificationCountApi;

export const markNotificationAsReadApi = async (id: number): Promise<Notification> => {
  const response = await apiClient.post<Notification>(
    '/notifications/' + id + '/read'
  );
  return response.data;
};

export const markAllNotificationsAsReadApi = async (): Promise<void> => {
  await apiClient.post('/notifications/read-all');
};

export const sendTestPushApi = async (): Promise<{ message: string; device_count: number }> => {
  const response = await apiClient.post<{ message: string; device_count: number }>('/notifications/test-push');
  return response.data;
};

const realtimeBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const realtimeStreamTimeout = Number(
  import.meta.env.VITE_NOTIFICATIONS_STREAM_TIMEOUT || (import.meta.env.DEV ? 0 : 120),
);
let realtimeAbortController: AbortController | null = null;
let realtimeStarted = false;
let lastRealtimeNotificationId = 0;

const dispatchRealtimeNotification = (notification: Notification) => {
  window.dispatchEvent(new CustomEvent<Notification>('notification-received', { detail: notification }));
};

const parseSseBlock = (block: string) => {
  const lines = block.split('\n');
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');
  const idLine = lines.find((line) => line.startsWith('id:'));
  if (!data) return;
  try {
    const notification = JSON.parse(data) as Notification;
    if (idLine) {
      lastRealtimeNotificationId = Math.max(
        lastRealtimeNotificationId,
        Number(idLine.slice(3).trim()) || 0
      );
    }
    dispatchRealtimeNotification(notification);
  } catch {
    // Ignore malformed blocks and allow the connection to reconnect.
  }
};

const runNotificationsRealtime = async () => {
  const controller = realtimeAbortController;
  if (!controller) return;

  let retryDelay = 2000;
  let consecutiveFailures = 0;

  while (realtimeStarted && realtimeAbortController === controller && !controller.signal.aborted) {
    const token = getToken();
    if (!token) return;

    try {
      const url = realtimeBaseUrl + '/notifications/stream?last_id=' + lastRealtimeNotificationId + '&timeout=' + realtimeStreamTimeout;
      const response = await fetch(url, {
        headers: {
          Accept: 'text/event-stream',
          Authorization: 'Bearer ' + token,
        },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error('Realtime notification stream unavailable');
      }

      // Reset retry delay on connection success
      retryDelay = 2000;
      consecutiveFailures = 0;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (realtimeStarted && realtimeAbortController === controller && !controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        blocks.forEach(parseSseBlock);
      }
    } catch {
      if (controller.signal.aborted || realtimeAbortController !== controller) return;
      consecutiveFailures++;
      retryDelay = Math.min(30000, retryDelay * 2);
    }

    if (realtimeStarted && realtimeAbortController === controller && !controller.signal.aborted) {
      // If we have failed multiple times continuously, back off significantly to prevent request spam
      const waitTime = consecutiveFailures > 3 ? retryDelay : 3000;
      await new Promise((resolve) => window.setTimeout(resolve, waitTime));
    }
  }
};

export const startNotificationsRealtime = (lastKnownId = 0) => {
  if (typeof window === 'undefined' || realtimeStarted) return;
  lastRealtimeNotificationId = Math.max(lastRealtimeNotificationId, lastKnownId);
  realtimeStarted = true;
  realtimeAbortController = new AbortController();
  void runNotificationsRealtime();
};

export const stopNotificationsRealtime = () => {
  realtimeStarted = false;
  realtimeAbortController?.abort();
  realtimeAbortController = null;
};
