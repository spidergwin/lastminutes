import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalRecording {
  id: string;
  title: string;
  uri: string;
  duration: number;
  createdAt: number;
  transcriptionStatus: 'pending' | 'uploading' | 'completed' | 'failed';
}

interface RecordingsState {
  recordings: LocalRecording[];
  addRecording: (recording: Omit<LocalRecording, 'id' | 'createdAt' | 'transcriptionStatus'>) => void;
  removeRecording: (id: string) => void;
  updateStatus: (id: string, status: LocalRecording['transcriptionStatus']) => void;
}

export const useRecordingsStore = create<RecordingsState>()(
  persist(
    (set) => ({
      recordings: [],
      addRecording: (data) => set((state) => {
        const newRecording: LocalRecording = {
          ...data,
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          createdAt: Date.now(),
          transcriptionStatus: 'pending',
        };
        return { recordings: [newRecording, ...state.recordings] };
      }),
      removeRecording: (id) => set((state) => ({
        recordings: state.recordings.filter(r => r.id !== id),
      })),
      updateStatus: (id, status) => set((state) => ({
        recordings: state.recordings.map(r => r.id === id ? { ...r, transcriptionStatus: status } : r),
      })),
    }),
    {
      name: 'last-minutes-recordings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
