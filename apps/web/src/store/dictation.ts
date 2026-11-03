import { create } from "zustand";

export interface DictationState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  language: string;
  targetLanguage: string | null;
  isProcessing: boolean;
  error: string | null;

  setIsListening: (listening: boolean) => void;
  setTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  setLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  appendTranscript: (text: string) => void;
}

const initialState = {
  isListening: false,
  transcript: "",
  interimTranscript: "",
  language: "en",
  targetLanguage: null,
  isProcessing: false,
  error: null,
};

export const useDictationStore = create<DictationState>((set) => ({
  ...initialState,

  setIsListening: (listening) => set({ isListening: listening }),
  setTranscript: (text) => set({ transcript: text }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  setLanguage: (lang) => set({ language: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
  appendTranscript: (text) =>
    set((state) => ({
      transcript: (state.transcript + " " + text).trim(),
      interimTranscript: "",
    })),
}));

export interface TranslationState {
  sourceText: string;
  translatedText: string;
  isTranslating: boolean;
  error: string | null;

  setSourceText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setIsTranslating: (translating: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTranslationStore = create<TranslationState>((set) => ({
  sourceText: "",
  translatedText: "",
  isTranslating: false,
  error: null,

  setSourceText: (text) => set({ sourceText: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setIsTranslating: (translating) => set({ isTranslating: translating }),
  setError: (error) => set({ error }),
}));
