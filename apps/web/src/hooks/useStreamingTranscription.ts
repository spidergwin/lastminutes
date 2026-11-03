/**
 * Real-time streaming transcription hook using Deepgram's browser SDK.
 *
 * Architecture: The browser connects directly to Deepgram's WebSocket servers
 * (not proxied through our Next.js server). Our server only provides temporary
 * API keys. This is the recommended pattern for Vercel deployment.
 *
 * Flow:
 * 1. Client requests a temporary API key from /api/transcription/token
 * 2. Opens a WebSocket to Deepgram using that key
 * 3. Streams audio from MediaRecorder in real-time
 * 4. Receives partial (interim) and final transcription results
 * 5. On session end, saves the complete transcript to the database
 */

"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useDictationStore } from "@/store/dictation";
import { toast } from "sonner";
import { gateway } from "@/lib/api-client";

interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  speaker?: number;
  words: TranscriptionWord[];
  isFinal: boolean;
}

interface StreamingTranscriptionState {
  isConnected: boolean;
  isConnecting: boolean;
  segments: TranscriptionSegment[];
  currentSpeaker: number | null;
  duration: number;
  error: string | null;
  audioBlob: Blob | null;
}

// Audio processing constants
const AUDIO_SAMPLE_RATE = 16000;
const AUDIO_CHANNELS = 1;
const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export function useStreamingTranscription() {
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const segmentsRef = useRef<TranscriptionSegment[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioChunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<StreamingTranscriptionState>({
    isConnected: false,
    isConnecting: false,
    segments: [],
    currentSpeaker: null,
    duration: 0,
    error: null,
    audioBlob: null,
  });

  const {
    setIsListening,
    appendTranscript,
    setInterimTranscript,
    setIsProcessing,
    setError: setStoreError,
    language,
  } = useDictationStore();

  /**
   * Fetch a temporary Deepgram API key from our backend.
   */
  const getTemporaryKey = useCallback(async (): Promise<string> => {
    try {
      const data = await gateway.post<{ key: string }>("/v1/transcription/token", { language });
      return data.key;
    } catch (err: any) {
      throw new Error(err.message || "Failed to get transcription token");
    }
  }, [language]);

  /**
   * Build WebSocket URL with transcription parameters.
   */
  const buildWsUrl = useCallback((apiKey: string): string => {
    const isMulti = language === "multi";
    const params = new URLSearchParams({
      model: isMulti ? "nova-3" : "nova-3", // User explicitly requested nova-3 for multi-language
      ...(isMulti ? { language: "multi" } : { language: language.split("-")[0] || "en" }),
      smart_format: "true",
      punctuate: "true",
      diarize: "true",
      filler_words: "false",
      interim_results: "true",
      utterance_end_ms: "1000",
      vad_events: "true",
      encoding: "linear16",
      sample_rate: String(AUDIO_SAMPLE_RATE),
      channels: String(AUDIO_CHANNELS),
    });

    return `${DEEPGRAM_WS_URL}?${params.toString()}`;
  }, [language]);

  /**
   * Start the streaming transcription session.
   */
  const startStreaming = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;

    setState((prev) => ({ ...prev, isConnecting: true, error: null, audioBlob: null }));
    setStoreError(null);
    segmentsRef.current = [];
    startTimeRef.current = Date.now();
    audioChunksRef.current = [];

    try {
      // Step 1: Get temporary API key
      const apiKey = await getTemporaryKey();

      // Step 2: Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: AUDIO_CHANNELS,
          sampleRate: AUDIO_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Initialize MediaRecorder to capture actual audio file
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setState((prev) => ({ ...prev, audioBlob: blob }));
        };

        mediaRecorder.start(1000);
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
        // Continue with transcription even if recording fails
      }

      // Step 3: Set up AudioContext for PCM encoding
      const audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode to capture raw PCM data
      const processor = audioContext.createScriptProcessor(4096, AUDIO_CHANNELS, AUDIO_CHANNELS);
      processorRef.current = processor;

      // Step 4: Open WebSocket to Deepgram
      const ws = new WebSocket(buildWsUrl(apiKey), ["token", apiKey]);
      websocketRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
        }));
        setIsListening(true);

        // Start streaming audio once WebSocket is ready
        processor.onaudioprocess = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);
            // Convert Float32 PCM to Int16 PCM
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            ws.send(int16Data.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "Results") {
            const alternative = data.channel?.alternatives?.[0];
            if (!alternative) return;

            const transcript = alternative.transcript;
            if (!transcript) return;

            const isFinal = data.is_final;
            const speechFinal = data.speech_final;

            const words: TranscriptionWord[] =
              alternative.words?.map((w: Record<string, unknown>) => ({
                word: w.word as string,
                start: w.start as number,
                end: w.end as number,
                confidence: w.confidence as number,
                speaker: w.speaker as number | undefined,
                punctuated_word: w.punctuated_word as string | undefined,
              })) ?? [];

            const segment: TranscriptionSegment = {
              text: transcript,
              start: data.start ?? 0,
              end: (data.start ?? 0) + (data.duration ?? 0),
              speaker: words[0]?.speaker,
              words,
              isFinal,
            };

            if (isFinal) {
              // Final result — append to permanent transcript
              segmentsRef.current = [...segmentsRef.current, segment];
              appendTranscript(transcript);
              setInterimTranscript("");

              setState((prev) => ({
                ...prev,
                segments: segmentsRef.current,
                currentSpeaker: segment.speaker ?? null,
                duration: (Date.now() - startTimeRef.current) / 1000,
              }));
            } else {
              // Interim result — show as preview
              setInterimTranscript(transcript);
            }
          }

          if (data.type === "UtteranceEnd") {
            // Speaker finished talking
            setInterimTranscript("");
          }
        } catch (err) {
          console.error("Error parsing Deepgram message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("Deepgram WebSocket error:", event);
        const errorMsg = "Connection error. Please check your network and try again.";
        setState((prev) => ({ ...prev, error: errorMsg }));
        setStoreError(errorMsg);
      };

      ws.onclose = (event) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        setIsListening(false);

        if (event.code !== 1000) {
          // Abnormal close
          const errorMsg = `Connection closed unexpectedly (code: ${event.code})`;
          setState((prev) => ({ ...prev, error: errorMsg }));
          setStoreError(errorMsg);
        }
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start transcription";

      console.error("Streaming transcription error:", err);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      setStoreError(errorMessage);
      toast.error(errorMessage);

      // Cleanup on failure
      cleanupResources();
    }
  }, [
    state.isConnected,
    state.isConnecting,
    getTemporaryKey,
    buildWsUrl,
    setIsListening,
    appendTranscript,
    setInterimTranscript,
    setStoreError,
    language,
  ]);

  /**
   * Stop the streaming transcription session.
   */
  const stopStreaming = useCallback(() => {
    // Send close signal to Deepgram
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      // Send empty buffer to signal end of audio
      websocketRef.current.send(new ArrayBuffer(0));
      websocketRef.current.close(1000, "User stopped");
    }

    cleanupResources();

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      duration: (Date.now() - startTimeRef.current) / 1000,
    }));
    setIsListening(false);
    setInterimTranscript("");
  }, [setIsListening, setInterimTranscript]);

  /**
   * Clean up all audio and WebSocket resources.
   */
  const cleanupResources = useCallback(() => {
    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream tracks (release microphone)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close(1000);
      }
      websocketRef.current = null;
    }
  }, []);

  /**
   * Get the final transcript data for saving.
   */
  const getTranscriptData = useCallback(() => {
    return {
      segments: segmentsRef.current,
      speakers: [
        ...new Set(
          segmentsRef.current
            .map((s) => s.speaker)
            .filter((s) => s !== undefined)
        ),
      ],
      duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      wordCount: segmentsRef.current.reduce(
        (total, seg) => total + seg.words.length,
        0
      ),
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    startStreaming,
    stopStreaming,
    getTranscriptData,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    segments: state.segments,
    currentSpeaker: state.currentSpeaker,
    duration: state.duration,
    error: state.error,
    audioBlob: state.audioBlob,
    isSupported:
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!window.WebSocket,
  };
}
