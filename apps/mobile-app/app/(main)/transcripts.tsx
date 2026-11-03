import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  Search, FileText, ChevronRight, Clock, Languages, Menu, Mic,
} from 'lucide-react-native';
import { useTranscripts, Transcript, useDeleteTranscript } from '../../hooks/useTranscripts';
import { useRecordingsStore, LocalRecording } from '../../store/recordings';
import { apiFetch } from '../../constants/api';
import { brand, gc } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { getLanguageName } from '../../constants/languages';

export default function TranscriptsScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: transcripts = [], isLoading, refetch } = useTranscripts();
  const deleteMutation = useDeleteTranscript();
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { recordings, removeRecording, updateStatus } = useRecordingsStore();

  const filteredTranscripts = transcripts.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.originalText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUploadDraft = async (recording: LocalRecording) => {
    try {
      updateStatus(recording.id, 'uploading');
      
      const formData = new FormData();
      formData.append('audio', {
        uri: recording.uri,
        name: 'recording.m4a',
        type: 'audio/m4a'
      } as any);

      const res = await apiFetch('/transcription/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      updateStatus(recording.id, 'completed');
      Alert.alert('Success', 'Recording uploaded for transcription successfully!');
      removeRecording(recording.id);
      refetch();
    } catch (e) {
      console.error(e);
      updateStatus(recording.id, 'failed');
      Alert.alert('Error', 'Failed to upload the recording. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const renderTranscript = ({ item }: { item: Transcript }) => (
    <Pressable
      onPress={() => router.push(`/(main)/transcript/${item.id}` as any)}
      onLongPress={() => {
        Alert.alert('Delete Transcript', 'Are you sure you want to delete this transcript?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => await deleteMutation.mutateAsync(item.id) },
        ]);
      }}
      className="flex-row items-center py-5 px-5"
      style={({ pressed }) => [
        { backgroundColor: colors.bg.secondary },
        pressed && { backgroundColor: colors.surface.hover },
      ]}
    >
      {/* Icon */}
      <View
        className="items-center justify-center w-10 h-10 mr-4 rounded-theme-lg"
        style={{ backgroundColor: brand.orangeMuted }}
      >
        <FileText size={18} color={brand.orange} strokeWidth={1.5} />
      </View>

      {/* Info */}
      <View className="flex-1 mr-2.5">
        <Text
          className="text-sm mb-1"
          numberOfLines={1}
          style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
        >
          {item.title}
        </Text>
        <Text
          className="text-xs mb-2.5"
          numberOfLines={1}
          style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
        >
          {item.originalText}
        </Text>

        {/* Meta row */}
        <View className="flex-row items-center">
          <View className="flex-row items-center">
            <Languages size={10} color={colors.text.muted} />
            <Text
              className="text-[11px] mx-0.5"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.muted }}
            >
              {getLanguageName(item.sourceLanguage)}
            </Text>
          </View>
          <Text className="text-[11px]" style={{ color: colors.text.muted }}>·</Text>
          <Text
            className="text-[11px] mx-0.5"
            style={{ fontFamily: 'Inter_500Medium', color: colors.text.muted }}
          >
            {item.wordCount} words
          </Text>
          <Text className="text-[11px]" style={{ color: colors.text.muted }}>·</Text>
          <View className="flex-row items-center">
            <Clock size={10} color={colors.text.muted} />
            <Text
              className="text-[11px] mx-0.5"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.muted }}
            >
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={16} color={colors.text.muted} strokeWidth={1.5} />
    </Pressable>
  );

  const ListHeader = () => (
    <View style={{ paddingTop: insets.top + 10 }} className="mb-6">
      {/* Navbar */}
      <View className="flex-row items-center justify-between mb-8">
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
            Transcripts
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/(main)/record')}
          className="overflow-hidden rounded-theme-md"
        >
          <LinearGradient
            colors={gc(gradients.brandPrimary)}
            className="flex-row items-center py-2 px-3.5 rounded-theme-md"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Mic size={14} color="#fff" strokeWidth={2} />
            <Text
              className="text-xs text-white ml-1.5"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              New
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View
        className="flex-row items-center h-[42px] px-4 rounded-theme-md"
        style={{
          backgroundColor: colors.bg.input,
          borderWidth: 1,
          borderColor: colors.border.default,
        }}
      >
        <Search size={16} color={colors.text.muted} />
        <TextInput
          className="flex-1 ml-2.5 text-sm"
          style={{
            color: colors.text.primary,
            fontFamily: 'Inter_400Regular',
          }}
          placeholder="Search by title or content..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} className="p-1">
            <Text className="text-sm" style={{ color: colors.text.muted }}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Results count */}
      {searchQuery.length > 0 && (
        <Text
          className="text-sm mt-2.5"
          style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
        >
          {filteredTranscripts.length} result{filteredTranscripts.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}

      {/* Local Drafts Section */}
      {recordings.length > 0 && !searchQuery && (
        <View className="mt-8 mb-4">
          <Text className="text-sm tracking-wide uppercase mb-3 px-2" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.tertiary }}>
            Local Drafts
          </Text>
          <View className="rounded-theme-xl overflow-hidden" style={{ backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
            {recordings.map((recording, i) => (
              <View key={recording.id} className="flex-row items-center py-4 px-4" style={[i > 0 && { borderTopWidth: 1, borderTopColor: colors.border.subtle }]}>
                <View className="items-center justify-center w-10 h-10 mr-4 rounded-theme-lg" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}>
                  <Mic size={18} color={brand.orange} />
                </View>
                <View className="flex-1 mr-3">
                  <Text className="text-sm mb-1" numberOfLines={1} style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>
                    {recording.title}
                  </Text>
                  <Text className="text-xs" style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}>
                    Duration: {recording.duration}s
                  </Text>
                </View>
                {recording.transcriptionStatus === 'uploading' ? (
                  <ActivityIndicator size="small" color={brand.orange} />
                ) : (
                  <Pressable 
                    onPress={() => handleUploadDraft(recording)}
                    className="px-3 py-1.5 rounded-theme-md"
                    style={{ backgroundColor: colors.surface.hover }}
                  >
                    <Text className="text-[11px]" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.secondary }}>Transcribe</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => removeRecording(recording.id)} className="p-2 ml-1">
                  <Text className="text-[16px]" style={{ color: colors.text.muted }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {!searchQuery && (
        <Text className="text-sm tracking-wide uppercase mt-8 mb-3 px-2" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.tertiary }}>
          Completed Transcripts
        </Text>
      )}
    </View>
  );

  const EmptyList = () => (
    <View
      className="items-center py-16 rounded-theme-lg"
      style={{
        backgroundColor: colors.bg.secondary,
        borderWidth: 1,
        borderColor: colors.surface.cardBorder,
      }}
    >
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
        {searchQuery ? 'No results found' : 'No transcripts yet'}
      </Text>
      <Text
        className="text-center text-sm max-w-[280px] px-6"
        style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
      >
        {searchQuery
          ? `No transcripts match "${searchQuery}". Try a different search.`
          : 'Start dictating or upload an audio file to create your first transcript.'}
      </Text>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <FlatList
        data={filteredTranscripts}
        renderItem={renderTranscript}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!isLoading ? EmptyList : (
          <View
            className="items-center py-16 rounded-theme-lg"
            style={{
              backgroundColor: colors.bg.secondary,
              borderWidth: 1,
              borderColor: colors.surface.cardBorder,
            }}
          >
            <ActivityIndicator size="small" color={brand.orange} />
            <Text
              className="text-sm mt-2"
              style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
            >
              Loading transcripts...
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View className="h-px mx-5" style={{ backgroundColor: colors.border.subtle }} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand.orange}
            colors={[brand.orange]}
          />
        }
      />
    </View>
  );
}
