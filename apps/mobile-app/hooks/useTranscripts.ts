import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../constants/api';

export interface Transcript {
  id: string;
  title: string;
  originalText: string;
  sourceLanguage: string;
  wordCount: number;
  createdAt: string;
  updatedAt?: string;
  fileType?: string;
  duration?: number;
  segments?: any[];
  speakers?: string[];
  summaries?: any[];
}

// ─── List all transcripts ────────────────────────────────────────
export function useTranscripts() {
  return useQuery<Transcript[]>({
    queryKey: ['transcripts'],
    queryFn: async () => {
      const response = await apiFetch('/transcripts');
      if (!response.ok) throw new Error('Failed to fetch transcripts');
      const json = await response.json();
      return json.data ?? [];
    },
  });
}

// ─── Single transcript by ID ─────────────────────────────────────
export function useTranscript(id: string) {
  return useQuery<Transcript>({
    queryKey: ['transcript', id],
    queryFn: async () => {
      const response = await apiFetch(`/transcripts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch transcript');
      const json = await response.json();
      return json.data;
    },
    enabled: !!id,
  });
}

// ─── Create transcript ──────────────────────────────────────────
export function useCreateTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      originalText: string;
      sourceLanguage: string;
      fileType?: string;
      segments?: any[];
      speakers?: string[];
      duration?: number;
    }) => {
      const response = await apiFetch('/transcripts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create transcript');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
    },
  });
}

// ─── Update transcript ──────────────────────────────────────────
export function useUpdateTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transcript> }) => {
      const response = await apiFetch(`/transcripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update transcript');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transcript', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
    },
  });
}

// ─── Delete transcript ──────────────────────────────────────────
export function useDeleteTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/transcripts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transcript');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
    },
  });
}

// ─── AI Summarize ───────────────────────────────────────────────
export function useSummarize() {
  return useMutation({
    mutationFn: async ({
      transcriptId,
      type,
    }: {
      transcriptId: string;
      type: string;
    }) => {
      const response = await apiFetch('/summarize', {
        method: 'POST',
        body: JSON.stringify({ transcriptId, type }),
      });
      if (!response.ok) throw new Error('Failed to generate summary');
      return response.json();
    },
  });
}
// ─── Delete Summary ───────────────────────────────────────────────
export function useDeleteSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/summaries/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete summary');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both lists and individual transcripts just in case
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
      // We don't have the transcriptId in the response usually, so we rely on the component to invalidate its specific query if needed
    },
  });
}
// ─── Translate ──────────────────────────────────────────────────
export function useTranslate() {
  return useMutation({
    mutationFn: async ({
      text,
      sourceLang,
      targetLang,
    }: {
      text: string;
      sourceLang: string;
      targetLang: string;
    }) => {
      const response = await apiFetch('/translate', {
        method: 'POST',
        body: JSON.stringify({ text, sourceLang, targetLang }),
      });
      if (!response.ok) throw new Error('Failed to translate');
      return response.json();
    },
  });
}

// ─── Usage data ─────────────────────────────────────────────────
interface UsageData {
  usage: {
    monthlyDictationMins: number;
    monthlyTranslations?: number;
    totalDictationMins?: number;
  };
  subscription: {
    plan: string;
  };
  monthlyTranscripts?: number;
}

export function useUsage() {
  return useQuery<UsageData>({
    queryKey: ['usage'],
    queryFn: async () => {
      const response = await apiFetch('/usage');
      if (!response.ok) throw new Error('Failed to fetch usage');
      return response.json();
    },
  });
}
