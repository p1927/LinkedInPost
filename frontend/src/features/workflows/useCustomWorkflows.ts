// frontend/src/features/workflows/useCustomWorkflows.ts

import { useState, useEffect, useCallback } from 'react';
import type { BackendApi } from '../../services/backendApi';
import type { CustomWorkflowSummary } from '../generation/WorkflowCardPicker';

export interface CreateWorkflowFormValues {
  name: string;
  description: string;
  optimizationTarget: string;
  generationInstruction: string;
  extendsWorkflowId: string;
  dimensionWeights: Record<string, number>;
}

interface UseCustomWorkflowsOptions {
  api: BackendApi;
  idToken: string;
  enabled: boolean;
}

interface UseCustomWorkflowsReturn {
  workflows: CustomWorkflowSummary[];
  isLoading: boolean;
  create: (payload: CreateWorkflowFormValues) => Promise<string | null>;
  update: (id: string, payload: CreateWorkflowFormValues) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  reload: () => void;
}

export function useCustomWorkflows({
  api,
  idToken,
  enabled,
}: UseCustomWorkflowsOptions): UseCustomWorkflowsReturn {
  const [workflows, setWorkflows] = useState<CustomWorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    api
      .listCustomWorkflows(idToken)
      .then(res => setWorkflows(res.workflows ?? []))
      .catch(() => setWorkflows([]))
      .finally(() => setIsLoading(false));
  }, [enabled, idToken, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(
    async (payload: CreateWorkflowFormValues): Promise<string | null> => {
      try {
        const res = await api.createCustomWorkflow(idToken, payload);
        reload();
        return res.id ?? null;
      } catch {
        return null;
      }
    },
    [api, idToken, reload],
  );

  const update = useCallback(
    async (id: string, payload: CreateWorkflowFormValues): Promise<boolean> => {
      try {
        await api.updateCustomWorkflow(idToken, id, payload);
        reload();
        return true;
      } catch {
        return false;
      }
    },
    [api, idToken, reload],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await api.deleteCustomWorkflow(idToken, id);
        reload();
        return true;
      } catch {
        return false;
      }
    },
    [api, idToken, reload],
  );

  return { workflows, isLoading, create, update, remove, reload };
}
