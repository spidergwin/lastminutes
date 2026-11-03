"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Transcript, CreateTranscriptInput, UpdateTranscriptInput } from "@/lib/validations";
import { gateway } from "@/lib/api-client";

interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export function useTranslate() {
  const mutation = useMutation({
    mutationFn: async (params: TranslateParams) => {
      return gateway.post<any>("/v1/translate", params);
    },
    onError: () => {
      toast.error("Translation failed");
    },
  });

  return mutation;
}

export function useTranscripts() {
  return useQuery<Transcript[]>({
    queryKey: ["transcripts"],
    queryFn: async () => {
      const json = await gateway.get<{ data: Transcript[] }>("/v1/transcripts");
      return json.data ?? [];
    },
  });
}

export function useTranscript(id: string) {
  return useQuery<Transcript>({
    queryKey: ["transcript", id],
    queryFn: async () => {
      const json = await gateway.get<{ data: Transcript }>(`/v1/transcripts/${id}`);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateTranscript() {
  return useMutation({
    mutationFn: async (data: CreateTranscriptInput) => {
      return gateway.post<any>("/v1/transcripts", data);
    },
  });
}

export function useDeleteTranscript() {
  return useMutation({
    mutationFn: async (id: string) => {
      return gateway.delete<any>(`/v1/transcripts/${id}`);
    },
  });
}

// ============= Usage Hook =============

interface UsageData {
  usage: {
    monthlyDictationMins: number;
    monthlyUploadMins: number;
    monthlyTranslations: number;
    totalDictationMins: number;
    totalUploadMins: number;
    totalTranslations: number;
  };
  subscription: {
    plan: string;
    status: string;
    trialEndsAt?: string | null;
  };
  monthlyTranscripts: number;
}

export function useUsage() {
  return useQuery<UsageData>({
    queryKey: ["usage"],
    queryFn: async () => {
      return gateway.get<UsageData>("/v1/usage");
    },
  });
}

// ============= Summarize Hook =============

interface SummarizeParams {
  transcriptId: string;
  type: "EXECUTIVE_SUMMARY" | "ACTION_ITEMS" | "KEY_DECISIONS" | "MEETING_NOTES" | "CUSTOM";
  customPrompt?: string;
}

export function useSummarize() {
  return useMutation({
    mutationFn: async (params: SummarizeParams) => {
      return gateway.post<any>("/v1/summarize", params);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Summary generated");
    },
  });
}

export function useDeleteSummary() {
  return useMutation({
    mutationFn: async (id: string) => {
      return gateway.delete<any>(`/v1/summarize/${id}`);
    },
  });
}

// ============= Update Transcript Hook =============

interface UpdateTranscriptParams {
  id: string;
  data: UpdateTranscriptInput;
}

export function useUpdateTranscript() {
  return useMutation({
    mutationFn: async ({ id, data }: UpdateTranscriptParams) => {
      return gateway.put<any>(`/v1/transcripts/${id}`, data);
    },
  });
}
