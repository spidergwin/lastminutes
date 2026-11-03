import React from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Linking, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import {
  Menu, Calendar, ExternalLink, Video,
  CheckCircle, Clock, AlertCircle, ChevronRight, Bot, Users, FileText,
} from 'lucide-react-native';
import { apiFetch } from '../../constants/api';
import { brand, typography, spacing, radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  meetingUrl?: string | null;
  platform?: string | null;
  botStatus?: string;
  transcriptId?: string | null;
  autoJoinEnabled?: boolean;
  attendees?: string[];
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

const statusConfig: Record<string, { color: (c: any) => string; label: string; icon: any }> = {
  idle: { color: colors => colors.text.muted, label: 'Scheduled', icon: Clock },
  scheduled: { color: colors => '#F59E0B', label: 'Bot Scheduled', icon: Bot },
  joining: { color: colors => '#F59E0B', label: 'Joining...', icon: Clock },
  recording: { color: colors => '#EF4444', label: 'Recording', icon: Video },
  processing: { color: colors => '#6366F1', label: 'Processing...', icon: Clock },
  completed: { color: colors => '#10B981', label: 'Completed', icon: CheckCircle },
  failed: { color: colors => '#EF4444', label: 'Failed', icon: AlertCircle },
};

function useCalendarEvents() {
  return useQuery<Meeting[]>({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const res = await apiFetch('/calendar/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const json = await res.json();
      const eventList = json.data ?? json.events ?? [];
      return Array.isArray(eventList) ? eventList : [];
    },
    retry: 1,
  });
}

function useCalendarStatus() {
  return useQuery<{ connected: boolean }>({
    queryKey: ['calendar-status'],
    queryFn: async () => {
      const res = await apiFetch('/calendar/status');
      if (!res.ok) return { connected: false };
      return res.json();
    },
    retry: 1,
  });
}

export default function MeetingsScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: events = [], isLoading, refetch } = useCalendarEvents();
  const { data: calStatus } = useCalendarStatus();
  const [refreshing, setRefreshing] = React.useState(false);

  const connected = calStatus?.connected ?? false;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDate = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return `Today at ${fmtTime(d)}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${fmtTime(d)}`;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleToggleAutoJoin = async (meetingId: string, enabled: boolean) => {
    try {
      const res = await apiFetch('/meetings/join', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, autoJoinEnabled: enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to update auto-join setting');
    }
  };

  const handleJoinNow = async (meetingId: string) => {
    try {
      const res = await apiFetch('/meetings/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });
      if (!res.ok) throw new Error('Failed');
      refetch();
      Alert.alert('Success', 'Bot is joining the meeting!');
    } catch {
      Alert.alert('Error', 'Failed to send bot');
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: insets.top + spacing.sm, paddingBottom: spacing['4xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.orange} colors={[brand.orange]} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text.primary }}>Meetings</Text>
        </View>

        {/* Meeting List */}
        {isLoading ? (
          <View className="items-center" style={{ paddingVertical: spacing['4xl'] }}>
            <ActivityIndicator size="large" color={brand.orange} />
          </View>
        ) : events.length === 0 ? (
          <View className="items-center" style={{
            backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 1,
            borderColor: colors.surface.cardBorder, paddingVertical: spacing['4xl'], paddingHorizontal: spacing.xl,
          }}>
            <Text style={{ fontSize: typography.size.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
              No upcoming meetings
            </Text>
            <Text className="text-center" style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, color: colors.text.tertiary, maxWidth: 260 }}>
              {connected ? 'No meetings found on your calendar.' : 'Connect your Google Calendar to see meetings here.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {(Array.isArray(events) ? events : []).map((meeting) => {
              const status = statusConfig[meeting.botStatus ?? 'idle'] ?? statusConfig.idle;
              const StatusIcon = status.icon;
              const isActive = ["joining", "recording", "processing"].includes(meeting.botStatus ?? '');
              const isCompleted = meeting.botStatus === "completed";
              const isMeetingStartingSoon = new Date(meeting.startTime).getTime() - Date.now() < 10 * 60 * 1000;

              return (
                <View
                  key={meeting.id}
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: isActive ? 'rgba(245,158,11,0.05)' : colors.bg.secondary,
                    borderColor: isActive ? 'rgba(245,158,11,0.3)' : colors.surface.cardBorder,
                    borderWidth: 1,
                  }}
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center flex-wrap mb-1">
                        <Text numberOfLines={1} style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginRight: 8 }}>
                          {meeting.title}
                        </Text>
                        {meeting.platform && (
                          <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: (PLATFORM_COLORS[meeting.platform] || colors.bg.tertiary) + '15', borderWidth: 1, borderColor: (PLATFORM_COLORS[meeting.platform] || colors.border.default) + '30' }}>
                            <Text style={{ fontSize: 9, fontFamily: typography.fontFamily.medium, color: PLATFORM_COLORS[meeting.platform] || colors.text.secondary }}>
                              {PLATFORM_LABELS[meeting.platform] || meeting.platform}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, fontFamily: typography.fontFamily.regular, color: colors.text.tertiary }}>
                        {fmtDate(meeting.startTime)}
                      </Text>
                    </View>
                    {isCompleted && meeting.transcriptId ? (
                      <Pressable onPress={() => router.push(`/(main)/transcript/${meeting.transcriptId}` as any)} className="flex-row items-center px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
                        <FileText size={12} color="#10B981" />
                        <Text style={{ fontSize: 10, fontFamily: typography.fontFamily.semibold, color: '#10B981', marginLeft: 4 }}>Transcript</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View className="flex-row items-center justify-between mt-1">
                    <View className="flex-row items-center">
                      <StatusIcon size={12} color={status.color(colors)} strokeWidth={2} />
                      <Text style={{ fontSize: 11, fontFamily: typography.fontFamily.medium, color: status.color(colors), marginLeft: 4 }}>
                        {status.label}
                      </Text>
                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <>
                          <Text style={{ fontSize: 11, color: colors.text.muted, marginHorizontal: 4 }}>·</Text>
                          <Users size={12} color={colors.text.muted} />
                          <Text style={{ fontSize: 11, fontFamily: typography.fontFamily.medium, color: colors.text.muted, marginLeft: 4 }}>{meeting.attendees.length}</Text>
                        </>
                      )}
                    </View>

                    {!isActive && !isCompleted && meeting.meetingUrl && (
                      <View className="flex-row items-center">
                        {isMeetingStartingSoon && (
                          <Pressable onPress={() => handleJoinNow(meeting.id)} className="mr-3 p-2 rounded-lg" style={{ backgroundColor: brand.orangeMuted }}>
                            <Bot size={16} color={brand.orange} />
                          </Pressable>
                        )}
                        <View className="flex-row items-center">
                          <Text style={{ fontSize: 10, color: colors.text.muted, marginRight: 6 }}>Auto-join</Text>
                          <Switch
                            value={meeting.autoJoinEnabled}
                            onValueChange={(val) => handleToggleAutoJoin(meeting.id, val)}
                            trackColor={{ false: colors.border.default, true: brand.orange }}
                            thumbColor="#fff"
                            ios_backgroundColor={colors.border.default}
                            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
