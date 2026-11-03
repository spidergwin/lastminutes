import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Menu, Send, Sparkles, FileText, MessageSquare, User,
  X, Plus, ChevronRight, Clock, Loader2,
  ListFilter, Bot,
} from 'lucide-react-native';
import { useTranscripts } from '../../hooks/useTranscripts';
import { useAuthStore } from '../../store/auth';
import { apiFetch, API_BASE_URL as API_URL, gateway } from '../../constants/api';
import { authClient } from '../../constants/auth-client';
import { brand, gc, type Colors, type Gradients, type GradientTuple } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { ColorValue } from 'react-native';

const { width: SW } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Helper ──────────────────────────────────────────────────────
function gradientColors(tuple: GradientTuple): readonly [ColorValue, ColorValue, ...ColorValue[]] {
  return tuple as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]];
}

// ─── Assistant UI Setup ────────────────────────────────────────
import { AssistantRuntimeProvider, useAuiState, useAui } from "@assistant-ui/react-native";
import type { ThreadMessage } from "@assistant-ui/react-native";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

export function useAppRuntime(transcriptId?: string | null, threadId?: string | null, initialMessages?: any[]) {
  return useChatRuntime({
    transport: new AssistantChatTransport({
      api: gateway.url("/chat"), // Redirect to Go Gateway
      headers: async () => {
        const session = await authClient.getSession();
        const token = session?.data?.token;
        return (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>;
      },
      body: {
        ...(transcriptId ? { transcriptId } : {}),
        ...(threadId ? { threadId } : {}),
      },
    }),
    messages: initialMessages,
  });
}

// ─── Main Chat Screen (rest of component follows...) ──────────────────
export default function ChatScreen() {
  const { transcriptId: initialTranscriptId } = useLocalSearchParams<{ transcriptId: string }>();
  const [transcriptId, setTranscriptId] = useState<string | null>(initialTranscriptId || null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [transcriptTitle, setTranscriptTitle] = useState<string | null>(null);

  const { data: initialMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["chat-history", transcriptId, threadId],
    queryFn: async () => {
      let url = `/chat/history`;
      if (threadId) {
        url += `?threadId=${threadId}`;
      } else if (transcriptId) {
        url += `?transcriptId=${transcriptId}`;
      }
      const res = await apiFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages || [];
    },
  });

  const runtime = useAppRuntime(transcriptId, threadId, initialMessages);

  if (isLoadingMessages) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatScreenContent
        transcriptId={transcriptId}
        threadId={threadId}
        transcriptTitle={transcriptTitle}
        setTranscriptId={setTranscriptId}
        setThreadId={setThreadId}
        setTranscriptTitle={setTranscriptTitle}
      />
    </AssistantRuntimeProvider>
  );
}

function ChatScreenContent({
  transcriptId,
  threadId,
  transcriptTitle,
  setTranscriptId,
  setThreadId,
  setTranscriptTitle,
}: any) {
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const [rightSheetVisible, setRightSheetVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const { data: transcripts = [], isLoading: isLoadingTranscripts } = useTranscripts();

  const { data: threadsData } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: async () => {
      const res = await apiFetch(`/chat/threads`);
      if (!res.ok) return { threads: [] };
      return res.json();
    },
    refetchInterval: 5000,
  });
  const threads = threadsData?.threads || [];

  const { data: transcript } = useQuery({
    queryKey: ["transcript", transcriptId],
    queryFn: async () => {
      if (!transcriptId) return null;
      const res = await apiFetch(`/transcripts/${transcriptId}`);
      if (!res.ok) return null;
      const { data } = await res.json();
      return data;
    },
    enabled: !!transcriptId,
  });

  useEffect(() => {
    if (transcript) setTranscriptTitle(transcript.title);
  }, [transcript]);

  // assistant-ui state
  const aui = useAui();
  const messages = useAuiState((s) => s.thread.messages) as unknown as ThreadMessage[];
  const isStreaming = useAuiState((s) => s.thread.isRunning);
  const inputText = useAuiState((s) => s.composer.text);

  // Gradient background pulse animation
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const gradientOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.3],
  });

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    aui.composer().setText(text);
    aui.composer().send();
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [aui, isStreaming]);

  // ─── Select Transcript Context ─────────────────────────────────
  const clearContext = useCallback(() => {
    setTranscriptId(null);
    setThreadId(null);
    setTranscriptTitle(null);
  }, [setTranscriptId, setThreadId, setTranscriptTitle]);

  const selectThread = useCallback((id: string) => {
    setThreadId(id);
    setTranscriptId(null);
    setTranscriptTitle(null);
    closeRightDrawer();
  }, [setThreadId, setTranscriptId, setTranscriptTitle]);

  const selectTranscript = useCallback((id: string, title: string) => {
    setTranscriptId(id);
    setThreadId(null);
    setTranscriptTitle(title);
    closeRightDrawer();
  }, [setTranscriptId, setThreadId, setTranscriptTitle]);

  // Right Drawer Animation
  const rightDrawerAnim = useRef(new RNAnimated.Value(SW)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  const openRightDrawer = () => {
    setRightSheetVisible(true);
    RNAnimated.parallel([
      RNAnimated.timing(rightDrawerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeRightDrawer = () => {
    RNAnimated.parallel([
      RNAnimated.timing(rightDrawerAnim, {
        toValue: SW,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRightSheetVisible(false);
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ─── Suggested Prompts ─────────────────────────────────────────
  const suggestions = transcriptId
    ? [
        { text: 'Summarize key points', icon: Sparkles },
        { text: 'List action items', icon: FileText },
        { text: 'Identify decisions made', icon: User },
        { text: 'Draft a follow-up email', icon: MessageSquare },
      ]
    : [
        { text: 'Write meeting minutes', icon: FileText },
        { text: 'Extract action items', icon: Sparkles },
        { text: 'Summarize decisions', icon: User },
        { text: 'Draft follow-up email', icon: MessageSquare },
      ];

  const getDisplayTitle = () => {
    if (threadId) {
      const currentThread = threads.find((t: any) => t.id === threadId);
      return currentThread?.title || "General Chat";
    }
    if (transcriptId) return transcriptTitle || "Meeting Chat";
    return "New AI Chat";
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      {/* Subtle animated gradient background */}
      <RNAnimated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          { opacity: gradientOpacity },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', // Indigo
            isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)', // Purple
            isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)', // Emerald
          ]}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </RNAnimated.View>

      {/* ── Header ── */}
      <View
        className="flex-row items-center justify-between px-5 z-10"
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.subtle,
        }}
      >
        {/* Left: Drawer trigger */}
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: colors.surface.hover }}
          hitSlop={12}
        >
          <Menu size={20} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>

        {/* Center: Title */}
        <View className="flex-1 mx-3 items-center">
          <Text
            className="text-[16px]"
            numberOfLines={1}
            style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
          >
            {getDisplayTitle()}
          </Text>
          {transcriptId && (
            <View className="flex-row items-center mt-0.5">
              <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: brand.orange }} />
              <Text className="text-[10px]" style={{ fontFamily: 'Inter_500Medium', color: colors.text.muted }}>
                Context Linked
              </Text>
            </View>
          )}
        </View>

        {/* Right: Transcripts/Projects sheet trigger */}
        <Pressable
          onPress={openRightDrawer}
          className="items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: colors.surface.hover }}
          hitSlop={12}
        >
          <ListFilter size={20} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* ── Chat Body ── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <EmptyState
              colors={colors}
              gradients={gradients}
              isDark={isDark}
              suggestions={suggestions}
              transcriptId={transcriptId}
              transcriptTitle={transcriptTitle}
              onSuggestionPress={sendMessage}
              onClearContext={clearContext}
            />
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                colors={colors}
                gradients={gradients}
                isDark={isDark}
                userInitials={getInitials(user?.name ?? null)}
              />
            ))
          )}

          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <View className="flex-row items-center mt-3 ml-1">
              <ActivityIndicator size="small" color={brand.orange} />
              <Text className="ml-2 text-xs" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>
                Thinking...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Input Bar ── */}
        <View
          className="px-4 pb-2 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          <View
            className="flex-row items-end rounded-3xl overflow-hidden shadow-sm"
            style={{
              backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              minHeight: 56,
            }}
          >
            <TextInput
              value={inputText}
              onChangeText={(t) => aui.composer().setText(t)}
              placeholder={transcriptId ? `Ask about this meeting...` : 'Ask anything...'}
              placeholderTextColor={colors.text.muted}
              multiline
              className="flex-1 px-5 py-4 text-[15px]"
              style={{
                fontFamily: 'Inter_400Regular',
                color: colors.text.primary,
                maxHeight: 120,
              }}
              onSubmitEditing={() => sendMessage(inputText)}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isStreaming}
              className="items-center justify-center w-10 h-10 m-2 rounded-full overflow-hidden"
              style={({ pressed }) => [
                (!inputText.trim() || isStreaming) && { opacity: 0.4 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <LinearGradient
                colors={['#6366f1', '#a855f7', '#10b981']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {isStreaming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={16} color="#fff" strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Right Sidebar Drawer ── */}
      <Modal
        visible={rightSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeRightDrawer}
      >
        <View className="flex-1 flex-row">
          <Pressable
            className="flex-1"
            onPress={closeRightDrawer}
          >
            <RNAnimated.View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                opacity: fadeAnim,
              }}
            />
          </Pressable>
          
          <RNAnimated.View
            style={{
              width: SW * 0.85, // 85% of screen width
              backgroundColor: colors.bg.primary,
              height: '100%',
              transform: [{ translateX: rightDrawerAnim }],
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 16),
              borderLeftWidth: 1,
              borderColor: colors.border.subtle,
              shadowColor: '#000',
              shadowOffset: { width: -5, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            {/* Sheet Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-border-subtle" style={{ borderColor: colors.border.subtle }}>
              <Text className="text-lg" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>
                History
              </Text>
              <Pressable
                onPress={closeRightDrawer}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surface.hover }}
              >
                <X size={16} color={colors.text.tertiary} />
              </Pressable>
            </View>

            {/* New Chat Button */}
            <View className="px-5 mt-4 mb-3">
              <Pressable
                onPress={() => {
                  const newThreadId = "gen-" + Math.random().toString(36).substring(2, 15);
                  setThreadId(newThreadId);
                  setTranscriptId(null);
                  setTranscriptTitle(null);
                  closeRightDrawer();
                }}
                className="flex-row items-center py-3.5 px-4 rounded-xl"
                style={({ pressed }) => [
                  {
                    borderWidth: 1,
                    borderColor: colors.border.default,
                    borderStyle: 'dashed' as const,
                  },
                  pressed && { backgroundColor: colors.surface.hover },
                ]}
              >
                <Plus size={18} color="#a855f7" strokeWidth={2} />
                <Text className="ml-3 text-sm" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>
                  New AI Chat
                </Text>
              </Pressable>
            </View>

            {/* General Chats */}
            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
              <View className="mb-6">
                <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1" style={{ color: colors.text.muted }}>
                  Recent Chats
                </Text>
                {threads.filter((t: any) => !t.transcriptId).length === 0 ? (
                  <Text className="text-xs italic px-1 py-1" style={{ color: colors.text.muted }}>No recent general chats.</Text>
                ) : (
                  threads.filter((t: any) => !t.transcriptId).map((t: any) => (
                    <Pressable
                      key={t.id}
                      onPress={() => selectThread(t.id)}
                      className="flex-row items-center py-3 px-4 mb-1 rounded-xl"
                      style={({ pressed }) => [
                        threadId === t.id ? { backgroundColor: colors.surface.hover, borderWidth: 1, borderColor: colors.border.default } : pressed ? { backgroundColor: colors.surface.hover } : {}
                      ]}
                    >
                      <MessageSquare size={14} color={threadId === t.id ? brand.orange : colors.text.muted} strokeWidth={1.5} />
                      <Text numberOfLines={1} className="ml-3 flex-1 text-sm" style={{ color: threadId === t.id ? colors.text.primary : colors.text.secondary, fontFamily: threadId === t.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                        {t.title}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>

              {/* Transcripts Section */}
              <View>
                <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1" style={{ color: colors.text.muted }}>
                  Transcripts
                </Text>
                {isLoadingTranscripts ? (
                  <ActivityIndicator size="small" color="#a855f7" />
                ) : (
                  transcripts.map((t: any) => (
                    <Pressable
                      key={t.id}
                      onPress={() => selectTranscript(t.id, t.title)}
                      className="flex-row items-center py-3 px-4 mb-1 rounded-xl"
                      style={({ pressed }) => [
                        transcriptId === t.id ? { backgroundColor: colors.surface.hover, borderWidth: 1, borderColor: colors.border.default } : pressed ? { backgroundColor: colors.surface.hover } : {}
                      ]}
                    >
                      <FileText size={14} color={transcriptId === t.id ? brand.orange : colors.text.muted} strokeWidth={1.5} />
                      <Text numberOfLines={1} className="ml-3 flex-1 text-sm" style={{ color: transcriptId === t.id ? colors.text.primary : colors.text.secondary, fontFamily: transcriptId === t.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                        {t.title}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </RNAnimated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Empty State Component ──────────────────────────────────────
function EmptyState({
  colors,
  gradients,
  isDark,
  suggestions,
  transcriptId,
  transcriptTitle,
  onSuggestionPress,
  onClearContext,
}: {
  colors: Colors;
  gradients: Gradients;
  isDark: boolean;
  suggestions: { text: string; icon: any }[];
  transcriptId: string | null;
  transcriptTitle: string | null;
  onSuggestionPress: (text: string) => void;
  onClearContext: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center" style={{ paddingTop: 60 }}>
      {/* AI Icon */}
      <View className="mb-6">
        <LinearGradient
          colors={['#6366f1', '#a855f7', '#10b981']}
          className="items-center justify-center w-16 h-16 rounded-[24px]"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles size={28} color="#fff" strokeWidth={1.8} />
        </LinearGradient>
      </View>

      <Text
        className="text-2xl text-center mb-2"
        style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}
      >
        {transcriptId ? transcriptTitle : 'Last Minutes AI'}
      </Text>
      <Text
        className="text-sm text-center mb-10 px-8"
        style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary, lineHeight: 20 }}
      >
        {transcriptId
          ? 'The AI has read this transcript. Ask anything about it.'
          : 'Get started by assigning a task. Not sure where to start?'}
      </Text>

      {/* Suggested prompts — chip style */}
      <View className="flex-row flex-wrap justify-center px-4 w-full" style={{ gap: 8 }}>
        {suggestions.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => onSuggestionPress(item.text)}
            className="flex-row items-center py-2.5 px-4 rounded-full"
            style={({ pressed }) => [
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
              pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
            ]}
          >
            <item.icon size={14} color="#a855f7" strokeWidth={2} />
            <Text
              className="text-[13px] ml-2"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
            >
              {item.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Chat Bubble Component ──────────────────────────────────────
function ChatBubble({
  message,
  colors,
  gradients,
  isDark,
  userInitials,
}: {
  message: ThreadMessage;
  colors: Colors;
  gradients: Gradients;
  isDark: boolean;
  userInitials: string;
}) {
  const isUser = message.role === 'user';

  return (
    <View className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <View
          className="w-7 h-7 rounded-lg items-center justify-center mr-2.5 mt-1"
          style={{ backgroundColor: brand.orangeMuted }}
        >
          <Bot size={14} color={brand.orange} strokeWidth={2} />
        </View>
      )}

      <View
        className="rounded-2xl px-4 py-3"
        style={{
          maxWidth: '80%',
          backgroundColor: isUser
            ? brand.orange
            : isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(0,0,0,0.04)',
          borderWidth: isUser ? 0 : 1,
          borderColor: isUser ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
        }}
      >
        <Text
          className="text-[14.5px]"
          style={{
            fontFamily: 'Inter_400Regular',
            color: isUser ? '#FFFFFF' : colors.text.primary,
            lineHeight: 22,
          }}
        >
          {message.content
            .filter((p) => p.type === 'text')
            .map((p) => ('text' in p ? p.text : ''))
            .join('\n')}
        </Text>
      </View>

      {isUser && (
        <LinearGradient
          colors={gradientColors(gradients.brandPrimary)}
          className="w-7 h-7 rounded-lg items-center justify-center ml-2.5 mt-1"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 8 }}
        >
          <Text
            className="text-[9px] text-white"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {userInitials}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

function EmptyStateWrapper(props: any) {
    return <EmptyState {...props} onClearContext={() => {}} />
}
