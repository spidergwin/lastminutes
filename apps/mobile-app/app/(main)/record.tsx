import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ColorValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
} from 'react-native-reanimated';
import { Canvas, Circle, Group, Blur } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EdgeInsets } from 'react-native-safe-area-context';
import {
  Mic,
  Square,
  Pause,
  X,
  ChevronLeft,
  RotateCcw,
  Save,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from 'expo-audio';
import { useNetwork } from '../../hooks/useNetwork';
import { useMobileStreamingTranscription } from '../../hooks/useMobileStreamingTranscription';
import { useRecordingsStore } from '../../store/recordings';
import { useCreateTranscript } from '../../hooks/useTranscripts';
import { brand, type Colors, type Gradients, type GradientTuple } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const { width: SW, height: SH } = Dimensions.get('window');

type RecordingState = 'idle' | 'recording' | 'paused';
type RecordingMode = 'online' | 'offline';

/** Helper to cast our gradient tuples to the type LinearGradient expects */
function gradientColors(tuple: GradientTuple): readonly [ColorValue, ColorValue, ...ColorValue[]] {
  return tuple as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]];
}

export default function RecordScreen() {
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();

  const [mode, setMode] = useState<RecordingMode>('offline');

  // Once network state resolves, default the mode (if idle)
  useEffect(() => {
    setMode(isOnline ? 'online' : 'offline');
  }, [isOnline]);

  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);

  // Use new expo-audio hook with metering enabled
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  const recorderState = useAudioRecorderState(recorder);
  const [saving, setSaving] = useState(false);

  // Online Streaming Hook
  const {
    startStreaming,
    stopStreaming,
    fullTranscript,
    interimTranscript,
    segments,
  } = useMobileStreamingTranscription('en');

  const { addRecording } = useRecordingsStore();
  const createTranscript = useCreateTranscript();

  const handleMainPress = useCallback(async () => {
    if (state === 'idle') {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
          return;
        }
      } catch (e) {
        console.error("Error requesting permission", e);
        return;
      }

      if (mode === 'online') {
        await startStreaming();
      } else {
        recorder.record();
      }
      setState('recording');
      setElapsed(0);
    } else if (state === 'recording') {
      if (mode === 'online') {
        stopStreaming();
        setState('idle');
      } else {
        setState('paused');
        try {
          recorder.pause();
        } catch (_) {
          // Swallow
        }
      }
    } else {
      // state === 'paused', resume offline recording
      if (mode === 'offline') {
        setState('recording');
        try {
          recorder.record();
        } catch (_) {
          // Swallow
        }
      }
    }
  }, [state, mode, recorder, startStreaming, stopStreaming]);

  const handleStop = useCallback(async () => {
    if (mode === 'online') {
      stopStreaming();
    } else {
      await recorder.stop();
    }
    setState('idle');
  }, [mode, recorder, stopStreaming]);

  const handleCancel = useCallback(async () => {
    if (mode === 'online') {
      stopStreaming();
    } else {
      await recorder.stop();
    }
    setState('idle');
    setElapsed(0);
  }, [mode, recorder, stopStreaming]);

  /** Save offline recording locally for later transcription */
  const handleSaveOffline = useCallback(() => {
    setSaving(true);
    setTimeout(async () => {
      if (recorder.uri) {
        addRecording({
          title: `Draft Recording — ${new Date().toLocaleTimeString()}`,
          uri: recorder.uri,
          duration: elapsed,
        });
      }
      setSaving(false);
      await handleStop();
      router.back();
    }, 500);
  }, [recorder.uri, elapsed, addRecording, handleStop]);

  /** Save online transcript to the backend */
  const handleSaveOnline = useCallback(async () => {
    const text = fullTranscript.trim();
    if (!text) return;

    // Extract unique speakers from Deepgram segments (Deepgram uses numeric speaker IDs like 0, 1, 2)
    // Convert to strings for consistency
    const uniqueSpeakers = new Set<string>();
    const formattedSegments = segments.map((s) => {
      const speakerId = s.speaker !== undefined ? s.speaker.toString() : '0';
      uniqueSpeakers.add(speakerId);
      return {
        ...s,
        speaker: speakerId,
      };
    });

    setSaving(true);
    try {
      const res = await createTranscript.mutateAsync({
        title: `Live Transcript — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        originalText: text,
        sourceLanguage: 'en',
        duration: elapsed,
        segments: formattedSegments.length > 0 ? formattedSegments : undefined,
        speakers: uniqueSpeakers.size > 0 ? Array.from(uniqueSpeakers) : undefined,
      });
      const newId = res.data?.id || res.id;
      stopStreaming();
      setState('idle');
      setElapsed(0);
      if (newId) {
        router.replace(`/(main)/transcript/${newId}` as any);
      } else {
        router.back();
      }
    } catch {
      Alert.alert('Error', 'Failed to save transcript. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [fullTranscript, elapsed, createTranscript, stopStreaming]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state === 'recording') {
      interval = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }, []);

  // Extract mode checks to variables to avoid TS narrowing issues in JSX
  const isOnlineMode = mode === 'online';
  const isOfflineMode = mode === 'offline';

  return (
    <View className="flex-1" style={{ backgroundColor: isOfflineMode ? colors.record.canvasBg : colors.bg.primary }}>
      {/* Background gradients for Offline mode */}
      {isOfflineMode && (
        <>
          <LinearGradient
            colors={gradientColors(gradients.recordBg)}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <OfflineSkiaBackground colors={colors} isDark={isDark} state={state} metering={recorderState.metering ?? -160} />
        </>
      )}

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 z-10"
        style={{ paddingTop: insets.top + 8, paddingBottom: 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center w-10 h-10 rounded-xl"
          style={({ pressed }) => [{ backgroundColor: isOnlineMode ? colors.surface.hover : 'rgba(255,255,255,0.1)' }, pressed && { opacity: 0.8 }]}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={isOnlineMode ? colors.text.primary : colors.record.topBarIcon} strokeWidth={1.5} />
        </Pressable>

        {state === 'idle' ? (
          <View className="flex-row p-1 rounded-xl" style={{ backgroundColor: isOnlineMode ? colors.bg.secondary : 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: isOnlineMode ? colors.surface.cardBorder : 'rgba(255,255,255,0.1)' }}>
            <Pressable
              onPress={() => setMode('online')}
              className="flex-row items-center px-4 py-1.5 rounded-lg"
              style={[isOnlineMode && { backgroundColor: brand.orangeMuted }]}
            >
              <Text className="text-[13px]" style={{ fontFamily: isOnlineMode ? 'Inter_600SemiBold' : 'Inter_500Medium', color: isOnlineMode ? brand.orange : (isDark ? colors.text.tertiary : 'rgba(255,255,255,0.6)') }}>Live Transcript</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('offline')}
              className="flex-row items-center px-4 py-1.5 rounded-lg"
              style={[isOfflineMode && { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Text className="text-[13px]" style={{ fontFamily: isOfflineMode ? 'Inter_600SemiBold' : 'Inter_500Medium', color: isOfflineMode ? '#fff' : (isDark ? colors.text.tertiary : 'rgba(255,255,255,0.6)') }}>Record</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center rounded-xl px-3.5 py-1.5" style={[{ backgroundColor: isOnlineMode ? colors.bg.secondary : colors.record.statusPillBg }, state === 'recording' && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={[{ backgroundColor: colors.text.muted }, state === 'recording' && { backgroundColor: '#EF4444' }]} />
            <Text className="text-xs tracking-wide" style={[{ fontFamily: 'Inter_500Medium', color: isOnlineMode ? colors.text.secondary : colors.record.statusPillText }, state === 'recording' && { color: '#EF4444' }]}>
              {state === 'recording' ? 'Recording' : 'Paused'}
            </Text>
          </View>
        )}

        <View className="w-10 h-10" />
      </View>

      {/* Main Content */}
      {isOnlineMode ? (
        <RealtimeView
          state={state}
          elapsed={elapsed}
          formatTime={formatTime}
          colors={colors}
          gradients={gradients}
          onMainPress={handleMainPress}
          onCancel={handleCancel}
          onSave={handleSaveOnline}
          saving={saving}
          fullTranscript={fullTranscript}
          interimTranscript={interimTranscript}
          segments={segments}
          insets={insets}
        />
      ) : (
        <OfflineView
          state={state}
          elapsed={elapsed}
          formatTime={formatTime}
          colors={colors}
          gradients={gradients}
          onMainPress={handleMainPress}
          onStop={handleSaveOffline}
          onCancel={handleCancel}
          insets={insets}
          metering={recorderState.metering ?? -160}
        />
      )}
    </View>
  );
}

// ─── Props Interfaces ───────────────────────────────────────────

interface RealtimeViewProps {
  state: RecordingState;
  elapsed: number;
  formatTime: (s: number) => string;
  colors: Colors;
  gradients: Gradients;
  onMainPress: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  fullTranscript: string;
  interimTranscript: string;
  segments: any[];
  insets: EdgeInsets;
}

interface OfflineViewProps {
  state: RecordingState;
  elapsed: number;
  formatTime: (s: number) => string;
  colors: Colors;
  gradients: Gradients;
  onMainPress: () => void;
  onStop: () => void;
  onCancel: () => void;
  insets: EdgeInsets;
  metering: number;
}

interface OfflineSkiaBgProps {
  colors: Colors;
  isDark: boolean;
  state: RecordingState;
  metering: number;
}

// ─── Realtime (Online) View ─────────────────────────────────────────

function RealtimeView({ state, elapsed, formatTime, colors, gradients, onMainPress, onCancel, onSave, saving, fullTranscript, interimTranscript, segments, insets }: RealtimeViewProps) {
  const displayTranscript = fullTranscript + (interimTranscript ? (fullTranscript ? " " : "") + interimTranscript : "");

  return (
    <View className="flex-1 px-4">
      <View className="flex-1 mb-4 rounded-3xl overflow-hidden" style={{ backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
        <View className="flex-row items-center justify-between px-5 py-3 border-b" style={{ borderColor: colors.border.subtle, backgroundColor: colors.surface.hover }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary, fontSize: 14 }}>Live Transcript</Text>
          {state === 'recording' && (
            <View className="flex-row items-center px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#EF4444' }}>REC {formatTime(elapsed)}</Text>
            </View>
          )}
        </View>
        <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 24 }}>
          {displayTranscript ? (
            <View>
              {segments && segments.length > 0 ? (
                segments.map((seg, i) => {
                  const speakerLabel = `Speaker ${seg.speaker !== undefined ? seg.speaker : '0'}`;
                  const isNewSpeaker = i === 0 || segments[i - 1].speaker !== seg.speaker;
                  const dotColor = seg.speaker === 0 ? '#3B82F6' : seg.speaker === 1 ? '#10B981' : seg.speaker === 2 ? '#F59E0B' : '#8B5CF6';
                  
                  return (
                    <View key={i} className="mb-2">
                      {isNewSpeaker && (
                        <View className="flex-row items-center mb-1">
                          <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: dotColor }} />
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: dotColor }}>
                            {speakerLabel}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 16, lineHeight: 26, color: colors.text.primary, fontFamily: 'Inter_400Regular', paddingLeft: 14 }}>
                        {seg.text}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={{ fontSize: 16, lineHeight: 26, color: colors.text.primary, fontFamily: 'Inter_400Regular' }}>
                  {fullTranscript}
                </Text>
              )}
              {interimTranscript ? (
                <Text style={{ fontSize: 16, lineHeight: 26, color: colors.text.muted, fontFamily: 'Inter_400Regular', marginTop: segments?.length > 0 ? 8 : 0 }}>
                  {interimTranscript}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="items-center justify-center py-20">
              <Text style={{ color: colors.text.muted, fontFamily: 'Inter_500Medium', fontSize: 14 }}>Press the microphone to start real-time transcription</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between p-4 mb-4">
        <Pressable onPress={onCancel} disabled={state === 'idle' && !displayTranscript} className="w-12 h-12 rounded-xl items-center justify-center" style={({ pressed }) => [{ backgroundColor: colors.surface.hover }, pressed && { opacity: 0.7 }]}>
          <RotateCcw size={20} color={colors.text.secondary} />
        </Pressable>

        <View className="flex-row items-center" style={{ marginHorizontal: 16 }}>
          <Pressable onPress={onMainPress} className="w-[64px] h-[64px] rounded-2xl items-center justify-center overflow-hidden" style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
            <LinearGradient colors={state === 'recording' ? (['#EF4444', '#B91C1C'] as const) : gradientColors(gradients.brandPrimary)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {state === 'recording' ? <Square size={24} color="#fff" fill="#fff" /> : <Mic size={28} color="#fff" />}
          </Pressable>
        </View>

        <Pressable onPress={onSave} disabled={!displayTranscript || saving} className="h-12 px-5 rounded-xl flex-row items-center justify-center overflow-hidden" style={({ pressed }) => [pressed && { opacity: 0.85 }, (!displayTranscript || saving) && { opacity: 0.5 }]}>
          <LinearGradient colors={gradientColors(gradients.brandPrimary)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Save size={18} color="#fff" />
              <Text className="ml-2 text-white" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Save</Text>
            </>
          )}
        </Pressable>
      </View>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

// ─── Offline (Gemini-style) View ────────────────────────────────────

function OfflineView({ state, elapsed, formatTime, colors, onMainPress, onStop, onCancel, insets, metering }: OfflineViewProps) {
  return (
    <View className="flex-1 z-10 justify-between">
      <View className="flex-1 items-center justify-center mt-10">
        {state !== 'idle' && (
          <Text className="text-4xl tracking-widest mb-1.5" style={{ fontFamily: 'Inter_700Bold', color: colors.record.timerText }}>
            {formatTime(elapsed)}
          </Text>
        )}
        <Text className="text-sm" style={{ fontFamily: 'Inter_400Regular', color: colors.record.hintText }}>
          {state === 'idle' ? 'Tap to start offline recording' : state === 'recording' ? 'Listening...' : 'Tap to resume'}
        </Text>
      </View>

      <View className="items-center" style={{ paddingBottom: Math.max(insets.bottom + 8, 32) }}>
        {state !== 'idle' ? (
          <View className="flex-row items-center justify-evenly w-full px-12">
            <Pressable onPress={onCancel} className="items-center justify-center w-[52px] h-[52px] rounded-xl" style={({ pressed }) => [{ backgroundColor: colors.record.buttonBg }, pressed && { opacity: 0.7 }]}>
              <X size={22} color={colors.record.topBarIcon} strokeWidth={1.8} />
            </Pressable>
            <Pressable onPress={onMainPress} className="items-center justify-center w-20 h-20 rounded-full bg-white z-20" style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
              {state === 'recording' ? <Pause size={32} color={colors.bg.primary} strokeWidth={2.5} /> : <Mic size={32} color={colors.bg.primary} strokeWidth={2.5} />}
            </Pressable>
            <Pressable onPress={onStop} className="items-center justify-center w-[52px] h-[52px] rounded-xl bg-red-500" style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Square size={18} color="#fff" strokeWidth={2} fill="#fff" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center justify-center w-full">
            <Pressable onPress={onMainPress} className="items-center justify-center w-20 h-20 rounded-full z-20" style={({ pressed }) => [{ backgroundColor: brand.orange }, pressed && { opacity: 0.85 }]}>
              <Mic size={32} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Offline Skia Background ────────────────────────────────────

function OfflineSkiaBackground({ colors, isDark, state, metering }: OfflineSkiaBgProps) {
  // Premium Gemini Live style colors
  const blob1 = isDark ? '#3B82F6' : '#60A5FA'; // Blue
  const blob2 = isDark ? '#A855F7' : '#C084FC'; // Purple
  const blob3 = isDark ? '#F97316' : '#FB923C'; // Orange
  const blob4 = isDark ? '#06B6D4' : '#22D3EE'; // Cyan

  // Normalize metering (-160..0)
  const targetScale = useMemo(() => {
    if (state !== 'recording') return 1;
    const normalized = Math.max(0, (metering + 50) / 50);
    return 1 + (normalized * 0.4); // scales from 1.0 to 1.4 when speaking
  }, [metering, state]);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(targetScale, { duration: 100, easing: Easing.out(Easing.ease) });
  }, [targetScale]);

  useEffect(() => {
    // Continuous slow rotation
    rotation.value = withRepeat(
      withTiming(360, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: state === 'idle' ? 0.9 : scale.value },
        { rotate: `${rotation.value}deg` }
      ],
      opacity: state === 'idle' ? 0.3 : withTiming(0.8, { duration: 600 }),
    };
  });

  // Make canvas bigger than screen so it covers when rotating
  const canvasSize = Math.max(SW, SH) * 1.5;
  const center = canvasSize / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" className="items-center justify-center overflow-hidden z-0">
      <Animated.View style={[{ width: canvasSize, height: canvasSize }, animStyle]}>
        <Canvas style={{ flex: 1 }}>
          <Group blendMode={isDark ? 'screen' : 'multiply'}>
            <Circle cx={center - 120} cy={center - 120} r={220} color={blob1} />
            <Circle cx={center + 120} cy={center - 80} r={200} color={blob2} />
            <Circle cx={center - 80} cy={center + 150} r={240} color={blob3} />
            <Circle cx={center + 150} cy={center + 100} r={210} color={blob4} />
            <Blur blur={90} />
          </Group>
        </Canvas>
      </Animated.View>
    </View>
  );
}
