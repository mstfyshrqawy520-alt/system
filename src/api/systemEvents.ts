import apiClient from './client';

export interface SystemEventActor {
  id?: number;
  name?: string;
  email?: string;
}

export interface SystemEvent {
  id: number;
  event_type: string;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  entity_label?: string | null;
  from_state?: string | null;
  to_state?: string | null;
  description?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  actor?: SystemEventActor | null;
  occurred_at?: string | null;
  date?: string | null;
  time?: string | null;
}

const getEvents = async (path: string): Promise<SystemEvent[]> => {
  const response = await apiClient.get<{ data: SystemEvent[] }>(path);
  return response.data.data || [];
};

export const getPurchaseRequestEventsApi = (id: number) =>
  getEvents(`/activity/purchase-requests/${id}`);

export const getPurchaseOrderEventsApi = (id: number) =>
  getEvents(`/activity/purchase-orders/${id}`);

export const getMyArchiveApi = () =>
  getEvents('/activity/my-archive');
