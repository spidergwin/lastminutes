"use client";

import { useState, useRef, useCallback } from "react";
import { useDictationStore } from "@/store/dictation";
import { toast } from "sonner";
import { gateway } from "@/lib/api-client";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { 
    appendTranscript, 
    setIsListening, 
    setIsProcessing,
    setError, 
    language 
  } = useDictationStore();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        setIsProcessing(false);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);
      setError(null);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or not available");
      toast.error("Could not access microphone");
    }
  }, [setIsListening, setError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    }
  }, [setIsListening]);

  const transcribeAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("language", language);

      const data = await gateway.post<{ success: boolean; text: string }>("/v1/transcribe", formData);

      if (data.success) {
        appendTranscript(data.text);
      } else {
        throw new Error("Transcription failed");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.message);
      toast.error("Failed to transcribe audio");
    }
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    isSupported: typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  };
}
