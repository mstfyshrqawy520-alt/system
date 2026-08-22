import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient, { cachedGetData, invalidateCachedGet } from '../api/client';

describe('cached GET data', () => {
  beforeEach(() => {
    invalidateCachedGet();
    vi.restoreAllMocks();
  });

  it('reuses a fresh response for the same session and parameters', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { value: 42 } } as never);

    const first = await cachedGetData<{ value: number }>('/reference-data', { params: { page: 1 } });
    const second = await cachedGetData<{ value: number }>('/reference-data', { params: { page: 1 } });

    expect(first).toEqual({ value: 42 });
    expect(second).toEqual({ value: 42 });
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests and supports targeted invalidation', async () => {
    let resolveRequest!: (value: { data: { value: number } }) => void;
    const response = new Promise<{ data: { value: number } }>((resolve) => { resolveRequest = resolve; });
    const getSpy = vi.spyOn(apiClient, 'get').mockReturnValue(response as never);

    const firstRequest = cachedGetData<{ value: number }>('/reference-data');
    const secondRequest = cachedGetData<{ value: number }>('/reference-data');
    resolveRequest({ data: { value: 7 } });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([{ value: 7 }, { value: 7 }]);
    expect(getSpy).toHaveBeenCalledTimes(1);

    invalidateCachedGet('/reference-data');
    await cachedGetData<{ value: number }>('/reference-data');
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
