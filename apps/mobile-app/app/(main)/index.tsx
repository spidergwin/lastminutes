import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Menu, Mic, Upload, FileText, Clock, ChevronRight, Sparkles,
  Plus, BarChart3, Languages, TrendingUp, RefreshCw,
} from 'lucide-react-native';
import { useTranscripts, useUsage, useDeleteTranscript } from '../../hooks/useTranscripts';
import { useAuthStore } from '../../store/auth';
import { useNetwork } from '../../hooks/useNetwork';
import { apiFetch } from '../../constants/api';
import { brand, shadows, gc, typography } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  platform?: string | null;
  botStatus?: string;
  transcriptId?: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  webex: "Webex",
};

const PLATFORM_COLORS: Record<string, string> = {
  zoom: "#3B82F6",
  google_meet: "#10B981",
  teams: "#8B5CF6",
  webex: "#06B6D4",
};

export default function DashboardScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: transcripts = [], isLoading: isLoadingTranscripts, refetch: refetchTranscripts } = useTranscripts();
  const { data: usageData, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsage();
  const deleteMutation = useDeleteTranscript();

  const { data: events = [], isLoading: isLoadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const res = await apiFetch('/calendar/events');
      if (!res.ok) return [];
      const json = await res.json();
      const eventList = json.data ?? json.events ?? [];
      return Array.isArray(eventList) ? eventList : [];
    },
    retry: 1,
  });

  const { user } = useAuthStore();
  const { isOnline } = useNetwork();
  const [refreshing, setRefreshing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const usedMinutes = usageData?.usage?.monthlyDictationMins || 0;
  const plan = usageData?.subscription?.plan || 'FREE';
  const totalWords = transcripts.reduce((acc, t) => acc + (t.wordCount || 0), 0);
  const uniqueLanguages = new Set(transcripts.map((t) => t.sourceLanguage || 'en'));
  const recentTranscripts = transcripts.slice(0, 5);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTranscripts(), refetchUsage(), refetchEvents()]);
    setRefreshing(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/calendar/events', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      await refetchEvents();
    } catch {
      Alert.alert('Error', 'Failed to sync calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statCardWidth = (width - 64 - 10) / 2; // px-8 (32*2) minus gap

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 32, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.orange} colors={[brand.orange]} />
        }
      >
        {/* ── Navbar ── */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            className="items-center justify-center w-[42px] h-[42px] rounded-full"
            style={{ backgroundColor: colors.surface.hover }}
            hitSlop={12}
          >
            <Menu size={22} color={colors.text.secondary} strokeWidth={1.5} />
          </Pressable>

          <View className="flex-1 ml-4">
            <Text
              className="text-[22px]"
              style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}
            >
              Dashboard
            </Text>
          </View>

          <View className="flex-row items-center">
            <View
              className="rounded-full px-4 py-1 mr-2.5"
              style={{ backgroundColor: brand.orangeMuted }}
            >
              <Text
                className="text-[11px]"
                style={{ fontFamily: 'Inter_600SemiBold', color: brand.orange }}
              >
                Free Plan
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(main)/settings')}>
              <LinearGradient
                colors={gc(gradients.brandPrimary)}
                className="items-center justify-center w-10 h-10 rounded-full"
                start={{ x: 0, y: 0 }}
                style={{ borderRadius: 999 }}
                end={{ x: 1, y: 1 }}
              >
                <Text
                  className="text-xs text-white"
                  style={{ fontFamily: 'Inter_700Bold' }}
                >
                  {getInitials(user?.name ?? null)}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ── Welcome ── */}
        <View className="mb-8">
          <Text
            className="text-[28px] -tracking-wider"
            style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}
          >
            Welcome back, {firstName} 👋
          </Text>
          <Text
            className="text-sm mt-1.5 mb-5"
            style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
          >
            Here's an overview of your transcription workspace.
          </Text>

          {/* New Dictation CTA */}
          <Pressable
            onPress={() => router.push('/(main)/record')}
            className="self-start overflow-hidden rounded-theme-lg"
            style={({ pressed }) => [
              shadows.md,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[...gradients.brandPrimary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center py-4 px-6 rounded-theme-lg"
            >
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text
                className="text-sm text-white ml-2.5"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                New Dictation
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Stats Grid ── */}
        <View className="flex-row flex-wrap mb-8">
          <StatCard
            label="TOTAL TRANSCRIPTS"
            value={isLoadingTranscripts ? '—' : String(transcripts.length)}
            sub="All time"
            icon={<FileText size={14} color={brand.orange + '80'} strokeWidth={1.8} />}
            isHighlighted
            width={statCardWidth}
            colors={colors}
          />
          <StatCard
            label="TOTAL WORDS"
            value={isLoadingTranscripts ? '—' : totalWords.toLocaleString()}
            sub="Across all transcripts"
            icon={<BarChart3 size={14} color={colors.text.muted} strokeWidth={1.8} />}
            width={statCardWidth}
            colors={colors}
            noMarginRight
          />
          <StatCard
            label="LANGUAGES USED"
            value={isLoadingTranscripts ? '—' : String(Math.max(uniqueLanguages.size, 1))}
            sub="18+ available"
            icon={<Languages size={14} color={colors.text.muted} strokeWidth={1.8} />}
            width={statCardWidth}
            colors={colors}
          />
          {/* Usage */}
          <View
            className="p-5 mb-2.5 rounded-theme-lg"
            style={{
              width: statCardWidth,
              backgroundColor: colors.bg.secondary,
              borderWidth: 1,
              borderColor: brand.orangeMuted,
            }}
          >
            <View className="flex-row justify-between items-center mb-2.5">
              <Text
                className="uppercase text-[11px] tracking-wider"
                style={{ fontFamily: 'Inter_500Medium', color: brand.orange }}
              >
                USAGE THIS MONTH
              </Text>
              <TrendingUp size={14} color={brand.orange + '80'} strokeWidth={1.8} />
            </View>
            <Text
              className="text-[28px]"
              style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}
            >
              {isLoadingUsage ? '—' : `${usedMinutes}`}
            </Text>
            <View
              className="overflow-hidden h-1 rounded-full mt-2.5 mb-1.5"
              style={{ backgroundColor: colors.border.default }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: brand.orange,
                  width: `${Math.min(100, usedMinutes)}%` as any,
                }}
              />
            </View>
            <Text
              className="text-xs mt-0.5"
              style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}
            >
              Minutes used ({plan} plan)
            </Text>
          </View>
        </View>

        {/* ── Quick Actions — Horizontal Scroll ── */}
        <View className="mb-8">
          <Text
            className="text-lg mb-5"
            style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
          >
            Quick Actions
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 32 }}
            style={{ marginHorizontal: -32, paddingHorizontal: 32 }}
          >
            <QuickActionCard
              label="Record"
              sub="Live dictation"
              icon={<Mic size={22} color="#fff" strokeWidth={2} />}
              gradientColors={[brand.orange, brand.orange + 'DD']}
              onPress={() => router.push('/(main)/record')}
              colors={colors}
            />
            <QuickActionCard
              label="Upload"
              sub="Batch transcribe"
              icon={<Upload size={22} color="#fff" strokeWidth={2} />}
              gradientColors={[brand.orange, brand.orange + 'DD']}
              onPress={() => router.push('/(main)/upload')}
              colors={colors}
            />
            <QuickActionCard
              label="Summary"
              sub="From transcript"
              icon={<Sparkles size={22} color="#fff" strokeWidth={2} />}
              gradientColors={['#22C55E', '#22C55EDD']}
              onPress={() => router.push('/(main)/transcripts')}
              colors={colors}
            />
          </ScrollView>
        </View>

        {/* ── Upcoming Meetings ── */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-5">
            <Text
              className="text-lg"
              style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
            >
              Upcoming Meetings
            </Text>
            <View className="flex-row items-center">
              <Pressable onPress={handleSync} disabled={isSyncing} className="mr-4">
                <RefreshCw size={14} color={colors.text.tertiary} className={isSyncing ? "animate-spin" : ""} />
              </Pressable>
              <Pressable onPress={() => router.push('/(main)/meetings')}>
                <Text
                  className="text-xs"
                  style={{ fontFamily: 'Inter_500Medium', color: colors.text.tertiary }}
                >
                  View All
                </Text>
              </Pressable>
            </View>
          </View>
          <View
            className="overflow-hidden rounded-theme-lg"
            style={{
              backgroundColor: colors.bg.secondary,
              borderWidth: 1,
              borderColor: colors.surface.cardBorder,
            }}
          >
            {isLoadingEvents ? (
              <View className="items-center py-10">
                <ActivityIndicator size="small" color={brand.orange} />
              </View>
            ) : !Array.isArray(events) || events.length === 0 ? (
              <View className="items-center py-10">
                <Text
                  className="text-sm"
                  style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
                >
                  No upcoming meetings today.
                </Text>
              </View>
            ) : (
              (Array.isArray(events) ? events.slice(0, 3) : []).map((meeting: Meeting, index: number) => (
                <Pressable
                  key={meeting.id}
                  onPress={() => {
                    if (meeting.transcriptId) router.push(`/(main)/transcript/${meeting.transcriptId}` as any);
                    else router.push('/(main)/meetings');
                  }}
                  className="flex-row items-center justify-between py-4 px-5"
                  style={({ pressed }) => [
                    pressed && { backgroundColor: colors.surface.hover },
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border.subtle },
                  ]}
                >
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center flex-wrap mb-0.5">
                      <Text
                        className="text-sm"
                        numberOfLines={1}
                        style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary, marginRight: 8 }}
                      >
                        {meeting.title}
                      </Text>
                      {meeting.platform && (
                        <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: (PLATFORM_COLORS[meeting.platform] || colors.bg.tertiary) + '15', borderWidth: 1, borderColor: (PLATFORM_COLORS[meeting.platform] || colors.border.default) + '30' }}>
                          <Text style={{ fontSize: 8, fontFamily: typography.fontFamily.medium, color: PLATFORM_COLORS[meeting.platform] || colors.text.secondary }}>
                            {PLATFORM_LABELS[meeting.platform] || meeting.platform}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className="text-[11px]"
                      style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
                    >
                      {new Date(meeting.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.text.muted} strokeWidth={1.5} />
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* ── Recent Transcripts ── */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-5">
            <Text
              className="text-lg"
              style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
            >
              Recent Transcripts
            </Text>
            {transcripts.length > 0 && (
              <Pressable onPress={() => router.push('/(main)/transcripts')}>
                <Text
                  className="text-xs"
                  style={{ fontFamily: 'Inter_500Medium', color: colors.text.tertiary }}
                >
                  View All
                </Text>
              </Pressable>
            )}
          </View>

          <View
            className="overflow-hidden rounded-theme-lg"
            style={{
              backgroundColor: colors.bg.secondary,
              borderWidth: 1,
              borderColor: colors.surface.cardBorder,
            }}
          >
            {isLoadingTranscripts ? (
              <View className="items-center py-16">
                <ActivityIndicator size="small" color={brand.orange} />
                <Text
                  className="text-sm mt-2.5"
                  style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
                >
                  Loading transcripts...
                </Text>
              </View>
            ) : recentTranscripts.length === 0 ? (
              <View className="items-center py-16">
                <View
                  className="items-center justify-center w-14 h-14 mb-5 rounded-theme-xl"
                  style={{ backgroundColor: brand.orangeMuted }}
                >
                  <FileText size={28} color={brand.orange + '80'} strokeWidth={1.5} />
                </View>
                <Text
                  className="text-lg mb-1.5"
                  style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
                >
                  No transcripts yet
                </Text>
                <Text
                  className="text-center text-sm max-w-[260px]"
                  style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
                >
                  Start dictating or upload an audio file to see your transcripts here.
                </Text>
              </View>
            ) : (
              recentTranscripts.map((transcript, index) => (
                <Pressable
                  key={transcript.id}
                  onPress={() => router.push(`/(main)/transcript/${transcript.id}` as any)}
                  onLongPress={() => {
                    Alert.alert('Delete Transcript', 'Are you sure you want to delete this transcript?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: async () => await deleteMutation.mutateAsync(transcript.id) },
                    ]);
                  }}
                  className="flex-row items-center py-4 px-5"
                  style={({ pressed }) => [
                    pressed && { backgroundColor: colors.surface.hover },
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border.subtle },
                  ]}
                >
                  <View
                    className="items-center justify-center w-9 h-9 mr-4 rounded-theme-md"
                    style={{ backgroundColor: brand.orangeMuted }}
                  >
                    <FileText size={16} color={brand.orange} strokeWidth={1.5} />
                  </View>
                  <View className="flex-1 mr-2.5">
                    <Text
                      className="text-sm mb-0.5"
                      numberOfLines={1}
                      style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
                    >
                      {transcript.title}
                    </Text>
                    <Text
                      className="text-xs"
                      numberOfLines={1}
                      style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
                    >
                      {transcript.originalText}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Clock size={11} color={colors.text.muted} />
                      <Text
                        className="text-[10px] ml-1"
                        style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}
                      >
                        {formatDate(transcript.createdAt)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        <View className="h-16" />
      </ScrollView>
    </View>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────
function StatCard({
  label, value, sub, icon, isHighlighted, width: cardWidth, colors, noMarginRight,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  isHighlighted?: boolean; width: number; colors: any; noMarginRight?: boolean;
}) {
  return (
    <View
      className="p-5 mb-2.5 rounded-theme-lg"
      style={{
        width: cardWidth,
        backgroundColor: colors.bg.secondary,
        borderWidth: 1,
        borderColor: isHighlighted ? brand.orangeMuted : colors.surface.cardBorder,
        marginRight: noMarginRight ? 0 : 10,
      }}
    >
      <View className="flex-row justify-between items-center mb-2.5">
        <Text
          className="uppercase text-[11px] tracking-wider"
          style={{
            fontFamily: 'Inter_500Medium',
            color: isHighlighted ? brand.orange : colors.text.tertiary,
          }}
        >
          {label}
        </Text>
        {icon}
      </View>
      <Text
        className="text-[28px]"
        style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}
      >
        {value}
      </Text>
      <Text
        className="text-xs mt-0.5"
        style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}
      >
        {sub}
      </Text>
    </View>
  );
}

// ─── Quick Action Card Component ─────────────────────────────────
function QuickActionCard({
  label, sub, icon, gradientColors, onPress, colors,
}: {
  label: string; sub: string; icon: React.ReactNode;
  gradientColors: string[]; onPress: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="p-4 w-100 items-center rounded-theme-xl"
      style={({ pressed }) => [
        {
          backgroundColor: colors.bg.secondary,
          borderWidth: 1,
          borderColor: colors.surface.cardBorder,
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 999 }}
        className="items-center justify-center w-11 h-11 mb-4 rounded-theme-lg"
      >
        {icon}
      </LinearGradient>
      <Text
        className="text-sm mb-0.5"
        style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
      >
        {label}
      </Text>
      <Text
        className="text-[11px]"
        style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
      >
        {sub}
      </Text>
    </Pressable>
  );
}
