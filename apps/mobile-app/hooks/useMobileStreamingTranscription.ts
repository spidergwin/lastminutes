import { useRef, useCallback, useState, useEffect } from "react";
import LiveAudioStream from "react-native-live-audio-stream";
import { Buffer } from "buffer";
import { apiFetch, WS_BASE_URL } from "../constants/api";
import { authClient } from "../constants/auth-client";

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
  interimTranscript: string;
  fullTranscript: string;
}

const AUDIO_SAMPLE_RATE = 16000;
const AUDIO_CHANNELS = 1;

export function useMobileStreamingTranscription(meetingId: string, language: string = "en") {
  const websocketRef = useRef<WebSocket | null>(null);
  const segmentsRef = useRef<TranscriptionSegment[]>([]);
  const startTimeRef = useRef<number>(0);
  const fullTranscriptRef = useRef<string>("");

  const [state, setState] = useState<StreamingTranscriptionState>({
    isConnected: false,
    isConnecting: false,
    segments: [],
    currentSpeaker: null,
    duration: 0,
    error: null,
    interimTranscript: "",
    fullTranscript: "",
  });

  const startStreaming = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const session = await authClient.getSession();
      const token = session?.data?.token;

      if (!token) {
        throw new Error("User is not authenticated");
      }

      // Point to our Rust Real-time Hub
      const ws = new WebSocket(`${WS_BASE_URL}/stream/${meetingId}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        // 1. Auth Handshake (First message is the JWT)
        ws.send(token);
        
        // 2. Identify the meeting (assuming Rust Hub protocol requires this as 2nd message)
        ws.send(meetingId);

        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
        }));
        
        LiveAudioStream.init({
          sampleRate: AUDIO_SAMPLE_RATE,
          channels: AUDIO_CHANNELS,
          bitsPerSample: 16,
          audioSource: 6,
          bufferSize: 4096,
        });
        
        LiveAudioStream.start();
        LiveAudioStream.on('data', (data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            const buffer = Buffer.from(data, 'base64');
            ws.send(buffer);
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          // Rust Hub sends back AI SDK fragments or transcription segments
          const data = JSON.parse(event.data);
          
          if (data.type === "segment") {
            const segment: TranscriptionSegment = data.payload;
            if (segment.isFinal) {
              segmentsRef.current = [...segmentsRef.current, segment];
              fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + segment.text;
              
              setState((prev) => ({
                ...prev,
                segments: segmentsRef.current,
                currentSpeaker: segment.speaker ?? null,
                fullTranscript: fullTranscriptRef.current,
              }));
            } else {
              setState((prev) => ({ ...prev, interimTranscript: segment.text }));
            }
          }
        } catch (err) {
          console.error("Error parsing message from Rust Hub:", err);
        }
      };

      ws.onerror = () => {
        setState((prev) => ({ ...prev, error: "Connection to Real-time Hub failed." }));
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, isConnected: false, isConnecting: false }));
        LiveAudioStream.stop();
      };
    } catch (err: any) {
      setState((prev) => ({ ...prev, isConnecting: false, error: err.message }));
    }
  }, [meetingId, language]);

  const stopStreaming = useCallback(() => {
    if (websocketRef.current) websocketRef.current.close();
    LiveAudioStream.stop();
  }, []);

  useEffect(() => {
    return () => {
        if (websocketRef.current) websocketRef.current.close();
        LiveAudioStream.stop();
    };
  }, []);

  return {
    startStreaming,
    stopStreaming,
    ...state,
  };
}
