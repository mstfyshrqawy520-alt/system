import { useCallback, useEffect, useRef, useState } from 'react';
import { CreatePurchaseRequestPayload, UpdatePurchaseRequestPayload } from '../types/purchaseRequest';
import { createPurchaseRequestApi, updatePurchaseRequestApi } from '../api/purchaseRequests';

const DRAFT_KEY = 'pr_wizard_draft';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface UsePRAutosaveReturn {
  draftId: number | null;
  saveState: SaveState;
  savedDraft: CreatePurchaseRequestPayload | null;
  saveDraft: (data: CreatePurchaseRequestPayload) => void;
  clearDraft: () => void;
  loadSavedDraft: () => CreatePurchaseRequestPayload | null;
}

export function usePRAutosave(): UsePRAutosaveReturn {
  const [draftId, setDraftId] = useState<number | null>(() => {
    const stored = localStorage.getItem(DRAFT_KEY + '_id');
    return stored ? parseInt(stored, 10) : null;
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingData = useRef<CreatePurchaseRequestPayload | null>(null);

  const loadSavedDraft = useCallback((): CreatePurchaseRequestPayload | null => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CreatePurchaseRequestPayload;
    } catch {
      return null;
    }
  }, []);

  const savedDraft = loadSavedDraft();

  const executeSave = useCallback(async (data: CreatePurchaseRequestPayload) => {
    setSaveState('saving');
    try {
      // Persist to localStorage immediately
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));

      // لا تحفظ إلى الـ API قبل اختيار المراجع وإضافة بند واحد على الأقل.
      if (!data.reviewer_user_id || !data.items || data.items.length === 0) {
        setSaveState('saved');
        return;
      }

      const storedId = localStorage.getItem(DRAFT_KEY + '_id');
      const existingId = storedId ? parseInt(storedId, 10) : null;

      if (existingId) {
        await updatePurchaseRequestApi(existingId, data as UpdatePurchaseRequestPayload);
      } else {
        // لا تنشئ مسودة بدون بنود.
        if (!data.items || data.items.length === 0 || !data.reviewer_user_id) {
          setSaveState('saved');
          return;
        }
        const created = await createPurchaseRequestApi(data);
        localStorage.setItem(DRAFT_KEY + '_id', String(created.id));
        setDraftId(created.id);
      }
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, []);

  const saveDraft = useCallback((data: CreatePurchaseRequestPayload) => {
    pendingData.current = data;
    // حفظ to localStorage immediately
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    setSaveState('saving');

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      if (pendingData.current) {
        executeSave(pendingData.current);
      }
    }, 2000);
  }, [executeSave]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY + '_id');
    setDraftId(null);
    setSaveState('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { draftId, saveState, savedDraft, saveDraft, clearDraft, loadSavedDraft };
}
