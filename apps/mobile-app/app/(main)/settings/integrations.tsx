import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Link2, Unplug, RefreshCw, CheckCircle2, Bot, Video, Settings as SettingsIcon, Shield, Zap, HardDrive } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../hooks/useTheme';
import { apiFetch } from '../../../constants/api';
import { brand, typography, spacing, radius } from '../../../constants/theme';

interface CalendarConnection {
  id: string;
  provider: string;
  email: string;
  enabled: boolean;
  connectedAt: string;
}

export default function IntegrationsScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadToken, setUploadToken] = useState("");
  const [isSavingStorage, setIsSavingStorage] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await apiFetch('/calendar/events');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setConnections(json.data?.connections ?? []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    Alert.alert('Connect Google Workspace', 'You will be redirected to the browser to complete authentication.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => {
        // We'd open WebBrowser here in a real app
        Alert.alert('Redirecting', 'Opening browser...');
      }}
    ]);
  };

  const handleDisconnect = async (provider: string) => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect this calendar?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        try {
          const res = await apiFetch('/calendar/disconnect', {
            method: 'DELETE',
            body: JSON.stringify({ provider }),
          });
          if (!res.ok) throw new Error('Failed');
          setConnections(prev => prev.filter(c => c.provider !== provider));
          Alert.alert('Success', 'Calendar disconnected');
        } catch {
          Alert.alert('Error', 'Failed to disconnect calendar');
        }
      }}
    ]);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/calendar/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const json = await res.json();
      const botsScheduled = json.data?.botsScheduled ?? 0;
      Alert.alert('Success', `Calendar synced! ${botsScheduled > 0 ? `${botsScheduled} bot(s) scheduled.` : ''}`);
    } catch {
      Alert.alert('Error', 'Failed to sync calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveStorage = async () => {
    setIsSavingStorage(true);
    try {
      const res = await apiFetch('/user/storage', {
        method: 'POST',
        body: JSON.stringify({ uploadThingToken: uploadToken }),
      });
      if (!res.ok) throw new Error('Failed to save storage settings');
      Alert.alert('Success', 'Storage settings updated');
    } catch {
      Alert.alert('Error', 'Failed to update storage settings');
    } finally {
      setIsSavingStorage(false);
    }
  };

  const hasCalendar = connections.length > 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary, paddingTop: insets.top }}>
      {/* Navbar */}
      <View className="flex-row items-center px-4 py-2.5">
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center w-[42px] h-[42px] rounded-full"
          style={{ backgroundColor: colors.surface.hover }}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>
        <View className="flex-1 ml-4">
          <Text className="text-[20px]" style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}>
            Integrations
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.xl, paddingBottom: 64 }}>
        <Text className="text-sm mb-6" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>
          Connect external services to enhance your meeting workflow.
        </Text>

        {/* Google Workspace */}
        <View className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
          <View className="p-5 border-b" style={{ borderBottomColor: colors.border.subtle }}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                  <Calendar size={20} color="#3B82F6" strokeWidth={1.8} />
                </View>
                <Text className="text-base" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>Google Workspace</Text>
              </View>
              {hasCalendar && (
                <View className="flex-row items-center px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
                  <CheckCircle2 size={12} color="#10B981" />
                  <Text className="text-[10px] ml-1" style={{ fontFamily: 'Inter_600SemiBold', color: '#10B981' }}>Connected</Text>
                </View>
              )}
            </View>
            <Text className="text-xs" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary, lineHeight: 18 }}>
              Connect your Google account to automatically sync calendar meetings and upload large recordings directly to your Google Drive.
            </Text>
          </View>
          
          <View className="p-5">
            {isLoading ? (
              <ActivityIndicator size="small" color={brand.orange} />
            ) : hasCalendar ? (
              <View style={{ gap: spacing.md }}>
                {connections.map(conn => (
                  <View key={conn.id} className="p-4 rounded-xl" style={{ backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.default }}>
                    <View className="flex-row items-center mb-3">
                      <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                        <CheckCircle2 size={16} color="#10B981" />
                      </View>
                      <View>
                        <Text className="text-sm" style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}>{conn.email}</Text>
                        <Text className="text-[10px]" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>Connected {new Date(conn.connectedAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Pressable onPress={handleSync} disabled={isSyncing} className="flex-1 flex-row items-center justify-center py-2 rounded-lg" style={{ backgroundColor: colors.surface.hover }}>
                        <RefreshCw size={14} color={colors.text.secondary} />
                        <Text className="text-xs ml-1.5" style={{ fontFamily: 'Inter_500Medium', color: colors.text.secondary }}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDisconnect(conn.provider)} className="flex-1 flex-row items-center justify-center py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                        <Unplug size={14} color="#EF4444" />
                        <Text className="text-xs ml-1.5" style={{ fontFamily: 'Inter_500Medium', color: '#EF4444' }}>Disconnect</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-2">
                <Text className="text-sm mb-4 text-center" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>No Google account connected yet.</Text>
                <Pressable onPress={handleConnect} className="w-full rounded-lg overflow-hidden">
                  <LinearGradient colors={['#3B82F6', '#0891B2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center justify-center py-3">
                    <Link2 size={16} color="#fff" strokeWidth={2} />
                    <Text className="text-sm text-white ml-2" style={{ fontFamily: 'Inter_600SemiBold' }}>Connect Google Workspace</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Meeting Bot */}
        <View className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
          <View className="p-5 border-b" style={{ borderBottomColor: colors.border.subtle }}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: brand.orangeMuted }}>
                  <Bot size={20} color={brand.orange} strokeWidth={1.8} />
                </View>
                <Text className="text-base" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>Meeting Bot</Text>
              </View>
              <View className="flex-row items-center px-2 py-1 rounded-md" style={{ backgroundColor: brand.orangeMuted, borderWidth: 1, borderColor: brand.orange + '40' }}>
                <Zap size={12} color={brand.orange} />
                <Text className="text-[10px] ml-1" style={{ fontFamily: 'Inter_600SemiBold', color: brand.orange }}>Add-on</Text>
              </View>
            </View>
            <Text className="text-xs" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary, lineHeight: 18 }}>
              Automatically join and record your meetings with an AI notetaker bot.
            </Text>
          </View>
          
          <View className="p-5">
            <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.default }}>
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-sm" style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}>Bot Display Name</Text>
                  <Text className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>The name shown when the bot joins.</Text>
                </View>
                <View className="px-2 py-1 rounded border" style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border.default }}>
                  <Text className="text-[10px]" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>Last Minutes Notetaker</Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-2">
                  <Text className="text-sm" style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}>Recording Mode</Text>
                  <Text className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>Optimized for accurate transcription.</Text>
                </View>
                <View className="px-2 py-1 flex-row items-center rounded border" style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border.default }}>
                  <Video size={10} color={colors.text.secondary} />
                  <Text className="text-[10px] ml-1" style={{ fontFamily: 'Inter_500Medium', color: colors.text.secondary }}>Optimized</Text>
                </View>
              </View>
            </View>

            <View className="p-4 rounded-xl flex-row" style={{ backgroundColor: brand.orangeMuted, borderWidth: 1, borderColor: brand.orange + '40' }}>
              <Shield size={16} color={brand.orange} className="mt-0.5 shrink-0" />
              <View className="ml-3 flex-1">
                <Text className="text-xs mb-1.5" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>How the meeting bot works</Text>
                <Text className="text-[10px] mb-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>1. Connect your calendar to detect meetings</Text>
                <Text className="text-[10px] mb-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>2. Enable "Auto-join" on specific meetings</Text>
                <Text className="text-[10px] mb-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>3. The bot joins at the scheduled time</Text>
                <Text className="text-[10px] mb-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>4. A full transcript is generated automatically</Text>
                </View>
                </View>

                <View className="p-4 rounded-xl mt-4" style={{ backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.default }}>
                <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-2">
                  <Text className="text-sm" style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}>Transcription Quality</Text>
                  <Text className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>High-accuracy speaker-diarized transcription.</Text>
                </View>
                <View className="px-2 py-1 flex-row items-center rounded border" style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border.default }}>
                  <SettingsIcon size={10} color={brand.orange} />
                  <Text className="text-[10px] ml-1" style={{ fontFamily: 'Inter_500Medium', color: brand.orange }}>Advanced AI</Text>
                </View>
                </View>
                </View>
                </View>
                </View>

                {/* Supported Platforms */}
                <View className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
                <View className="p-5 border-b" style={{ borderBottomColor: colors.border.subtle }}>
                <Text className="text-base" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>Supported Platforms</Text>
                <Text className="text-xs" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary, lineHeight: 18 }}>
                The meeting bot can join meetings on all major platforms.
                </Text>
                </View>
                <View className="p-5 flex-row flex-wrap" style={{ gap: 8 }}>
                {[
                { name: 'Zoom', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                { name: 'Google Meet', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                { name: 'MS Teams', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
                { name: 'Webex', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
                ].map(platform => (
                <View key={platform.name} className="flex-1 min-w-[45%] rounded-xl p-3 items-center border" style={{ backgroundColor: platform.bg, borderColor: platform.color + '30' }}>
                <Video size={20} color={platform.color} className="mb-2" />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: platform.color }}>{platform.name}</Text>
                </View>
                ))}
                </View>
                </View>

                {/* Custom Storage */}

        <View className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
          <View className="p-5 border-b" style={{ borderBottomColor: colors.border.subtle }}>
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                <HardDrive size={20} color="#6366F1" strokeWidth={1.8} />
              </View>
              <Text className="text-base" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>Custom Storage</Text>
            </View>
            <Text className="text-xs" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary, lineHeight: 18 }}>
              Bring your own storage to host your transcribed files and recordings.
            </Text>
          </View>
          
          <View className="p-5">
            <Text className="text-sm mb-2" style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}>UploadThing Token (v7)</Text>
            <TextInput
              value={uploadToken}
              onChangeText={setUploadToken}
              placeholder="eyJ..."
              placeholderTextColor={colors.text.muted}
              secureTextEntry
              style={{
                backgroundColor: colors.bg.primary,
                borderWidth: 1,
                borderColor: colors.border.default,
                borderRadius: 8,
                padding: 12,
                color: colors.text.primary,
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                marginBottom: 16
              }}
            />
            <Pressable onPress={handleSaveStorage} disabled={isSavingStorage} className="w-full rounded-lg overflow-hidden">
              <LinearGradient colors={['#6366F1', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center justify-center py-3">
                {isSavingStorage ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-sm text-white" style={{ fontFamily: 'Inter_600SemiBold' }}>Save Storage Settings</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
