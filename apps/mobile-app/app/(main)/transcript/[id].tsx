import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
  ActivityIndicator, TextInput, Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Copy, Share2, Trash2, Sparkles,
  FileText, Clock, Languages, BarChart3, Check,
  ChevronDown, Download, MessageSquare, AlertCircle, RotateCcw,
} from 'lucide-react-native';
import {
  useTranscript, useDeleteTranscript,
  useUpdateTranscript, useSummarize, useDeleteSummary, useTranslate
} from '../../../hooks/useTranscripts';
import Markdown from 'react-native-markdown-display';
import { brand, typography, spacing, radius, shadows } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import { ConversationEditor } from '../../../components/ui/ConversationEditor';
import { AudioPlayer } from '../../../components/AudioPlayer';
import { SUPPORTED_LANGUAGES, getLanguageName } from '../../../constants/languages';
import { API_BASE_URL } from '../../../constants/api';
import { authClient } from '../../../constants/auth-client';

const SUMMARY_TYPES = [
  { key: 'EXECUTIVE_SUMMARY', label: 'Executive Summary' },
  { key: 'ACTION_ITEMS', label: 'Action Items' },
  { key: 'KEY_DECISIONS', label: 'Key Decisions' },
  { key: 'MEETING_NOTES', label: 'Meeting Notes' },
];

const EXPORT_FORMATS = [
  { key: 'txt', label: 'TXT', icon: '📄' },
  { key: 'pdf', label: 'PDF', icon: '📑' },
  { key: 'docx', label: 'DOCX', icon: '📘' },
  { key: 'json', label: 'JSON', icon: '📋' },
  { key: 'srt', label: 'SRT', icon: '🎬' },
  { key: 'vtt', label: 'VTT', icon: '🎞' },
];

const markdownStyles = (colors: any) => ({
  body: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * 1.6,
  },
  heading1: { fontFamily: typography.fontFamily.bold, color: colors.text.primary, fontSize: typography.size.lg, marginTop: 12, marginBottom: 6 },
  heading2: { fontFamily: typography.fontFamily.bold, color: colors.text.primary, fontSize: typography.size.md, marginTop: 10, marginBottom: 5 },
  heading3: { fontFamily: typography.fontFamily.semibold, color: colors.text.primary, fontSize: typography.size.sm, marginTop: 8, marginBottom: 4 },
  strong: { fontFamily: typography.fontFamily.bold, color: colors.text.primary },
  em: { fontFamily: typography.fontFamily.regular, fontStyle: 'italic' as const },
  list_item: { marginBottom: 4 },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
});

export default function TranscriptDetailScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transcript, isLoading } = useTranscript(id ?? '');
  const deleteMut = useDeleteTranscript();
  const updateMut = useUpdateTranscript();
  const summaryMut = useSummarize();
  const deleteSummaryMut = useDeleteSummary();
  const translateMut = useTranslate();

  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [summaryType, setSummaryType] = useState('EXECUTIVE_SUMMARY');
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Translation State
  const [targetLang, setTargetLang] = useState('fr');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');
  const [translateProgress, setTranslateProgress] = useState('');

  const displaySegments = useMemo(() => {
    const segs = (transcript?.segments as any[]) ?? [];
    if (viewMode === 'translated') {
      return segs.map(seg => ({
        ...seg,
        text: seg.translatedText || seg.text
      }));
    }
    return segs.map(seg => ({
      ...seg,
      text: seg.originalText || seg.text
    }));
  }, [viewMode, transcript?.segments]);

  const handleTranslate = async () => {
    if (!transcript) return;
    setTranslateProgress('Translating main text...');
    try {
      const result = await translateMut.mutateAsync({
        text: transcript.originalText,
        sourceLang: transcript.sourceLanguage,
        targetLang,
      });

      const translatedText = result.data.translatedText;
      let newSegments = null;

      if (transcript.segments && transcript.segments.length > 0) {
        const segs = transcript.segments as any[];
        const segmentsResult = [];
        for (let i = 0; i < segs.length; i++) {
          setTranslateProgress(`Translating ${i + 1} of ${segs.length}...`);
          const seg = segs[i];
          const segmentText = seg.originalText || seg.text;
          if (!segmentText?.trim()) {
             segmentsResult.push({ ...seg, text: '', originalText: '' });
             continue;
          }
          const tRes = await translateMut.mutateAsync({
            text: segmentText,
            sourceLang: transcript.sourceLanguage,
            targetLang,
          });
          segmentsResult.push({
            ...seg,
            originalText: segmentText,
            translatedText: tRes.data.translatedText
          });
        }
        newSegments = segmentsResult;
      }

      setTranslateProgress('Saving...');
      await updateMut.mutateAsync({
        id: transcript.id,
        data: {
          translatedText,
          targetLanguage: targetLang,
          ...(newSegments && { segments: newSegments })
        }
      });
      setViewMode('translated');
      Alert.alert('Success', 'Translation complete');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Translation failed');
    } finally {
      setTranslateProgress('');
    }
  };

  const handleExport = async (format: string) => {
    if (!id || !transcript) return;
    try {
      setIsExporting(format);
      const url = `${API_BASE_URL}/export/${id}?format=${format}`;
      const cookies = authClient.getCookie();

      const safeTitle = transcript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const file = new File(Paths.cache, `${safeTitle}_${id.substring(0, 8)}.${format}`);

      await File.downloadFileAsync(url, file, {
        headers: cookies ? { Cookie: cookies } : {},
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: `Export Transcript (${format.toUpperCase()})`,
        });
      } else {
        Alert.alert('Sharing not available', 'Unable to share on this device.');
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Export Error', 'Failed to export transcript. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleCopy = useCallback(async () => {
    if (!transcript?.originalText) return;
    await Share.share({ message: transcript.originalText });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcript]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDur = (d?: number) => d ? `${Math.floor(d/60)}m ${d%60}s` : '—';
  
  const handleSummarize = async () => {
    if (!transcript) return;
    try {
      const result = await summaryMut.mutateAsync({ transcriptId: transcript.id, type: summaryType as any });
      setSummaryResult(result.content);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Summarization failed');
    }
  };
  
  const handleDeleteSummary = (id: string) => {
      Alert.alert('Delete Summary', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => await deleteSummaryMut.mutateAsync(id) }
      ]);
  };

  if (isLoading || !transcript) return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={brand.orange} />
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: insets.top + spacing.sm, paddingBottom: spacing['4xl'] }}>
        {/* Header */}
        <View className="flex-row items-center mb-6">
            <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                <ChevronLeft size={24} color={colors.text.primary} />
            </Pressable>
            <Text style={{ fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text.primary, marginLeft: spacing.sm }}>Transcript Detail</Text>
        </View>

        <Pressable onPress={() => setEditingTitle(!editingTitle)} style={{ marginBottom: spacing.sm }}>
            <Text style={{ fontSize: typography.size.xl, fontFamily: typography.fontFamily.bold, color: colors.text.primary, letterSpacing: typography.letterSpacing.tight }}>{transcript.title}</Text>
        </Pressable>
        <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, color: colors.text.tertiary, marginBottom: spacing.xl }}>{fmtDate(transcript.createdAt)}</Text>

        {/* Audio Player */}
        {transcript.fileUrl && (
          <View style={{ marginBottom: spacing.xl }}>
            <AudioPlayer url={transcript.fileUrl} />
          </View>
        )}

        {/* Metadata */}
        <View style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface.cardBorder, padding: spacing.lg, marginBottom: spacing.xl }}>
          <View className="flex-row items-center justify-between mb-4">
             <View className="flex-row items-center">
                <BarChart3 size={16} color={brand.orange} strokeWidth={2} />
                <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginLeft: spacing.sm }}>Details</Text>
             </View>
             <View className="flex-row items-center bg-muted rounded-md p-0.5 border" style={{ backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }}>
                <Pressable onPress={() => setViewMode('original')} className="px-2 py-1 rounded" style={viewMode === 'original' && { backgroundColor: colors.bg.secondary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                  <Text style={{ fontSize: 10, fontFamily: typography.fontFamily.medium, color: viewMode === 'original' ? colors.text.primary : colors.text.muted }}>Original</Text>
                </Pressable>
                {transcript.translatedText && (
                  <Pressable onPress={() => setViewMode('translated')} className="px-2 py-1 rounded" style={viewMode === 'translated' && { backgroundColor: colors.bg.secondary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                    <Text style={{ fontSize: 10, fontFamily: typography.fontFamily.medium, color: viewMode === 'translated' ? colors.text.primary : colors.text.muted }}>Translated</Text>
                  </Pressable>
                )}
             </View>
          </View>
          <View className="flex-row flex-wrap">
            {[
              { label: 'Words', value: transcript.wordCount?.toLocaleString() || '0' },
              { label: 'Duration', value: fmtDur(transcript.duration) },
              { label: 'Language', value: getLanguageName(transcript.sourceLanguage) },
              { label: 'Type', value: transcript.fileType || 'Dictation' },
            ].map((m, i) => (
              <View key={i} className="flex-row items-center justify-between w-full mb-2">
                <Text style={{ fontSize: typography.size.xs, fontFamily: typography.fontFamily.medium, color: colors.text.muted }}>{m.label}</Text>
                <Text style={{ fontSize: typography.size.xs, fontFamily: typography.fontFamily.semibold, color: colors.text.primary }}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Transcript Body */}
        <View style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface.cardBorder, padding: spacing.lg, marginBottom: spacing.xl }}>
          {transcript.segments && transcript.segments.length > 0 ? (
            <ConversationEditor
              initialSegments={displaySegments}
              initialSpeakers={transcript.speakers ?? []}
              isSaving={updateMut.isPending}
              onSave={async (newSegments, newSpeakers, newOriginalText) => {
                await updateMut.mutateAsync({
                  id: transcript.id,
                  data: {
                    segments: newSegments,
                    speakers: newSpeakers,
                    originalText: newOriginalText
                  }
                });
              }}
            />
          ) : (
            <>
              <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: typography.size.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary }}>Transcript</Text>
              </View>
              <Text selectable style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, color: colors.text.secondary, lineHeight: typography.size.sm * 1.7 }}>
                {viewMode === 'translated' ? transcript.translatedText : transcript.originalText}
              </Text>
            </>
          )}
        </View>

        {/* Translation Section */}
        <View style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 1, borderColor: brand.orange + '20', padding: spacing.lg, marginBottom: spacing.xl }}>
          <View className="flex-row items-center" style={{ marginBottom: spacing.base }}>
            <Languages size={18} color={brand.orange} strokeWidth={2} />
            <Text style={{ fontSize: typography.size.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginLeft: spacing.sm }}>Translate</Text>
          </View>
          
          <Text style={{ fontSize: typography.size.xs, color: colors.text.muted, marginBottom: spacing.sm }}>Target Language</Text>
          <Pressable onPress={() => setShowLangPicker(!showLangPicker)} className="flex-row items-center justify-between"
            style={{ backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.base, paddingVertical: spacing.md, marginBottom: showLangPicker ? 0 : spacing.md }}>
            <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.medium, color: colors.text.primary }}>{SUPPORTED_LANGUAGES[targetLang]?.name}</Text>
            <ChevronDown size={16} color={colors.text.muted} />
          </Pressable>
          
          {showLangPicker && (
            <View style={{ backgroundColor: colors.bg.elevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, marginBottom: spacing.md, maxHeight: 200 }}>
              <ScrollView nestedScrollEnabled>
                {Object.entries(SUPPORTED_LANGUAGES)
                  .filter(([code]) => code !== transcript.sourceLanguage)
                  .map(([code, { name }]) => (
                  <Pressable key={code} onPress={() => { setTargetLang(code); setShowLangPicker(false); }}
                    style={[{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }, targetLang === code && { backgroundColor: brand.orangeMuted }]}>
                    <Text style={{ fontSize: typography.size.sm, fontFamily: targetLang === code ? typography.fontFamily.semibold : typography.fontFamily.regular, color: targetLang === code ? brand.orange : colors.text.primary }}>{name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Pressable onPress={handleTranslate} disabled={translateMut.isPending} className="overflow-hidden" style={({ pressed }) => [{ borderRadius: radius.lg }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={[...gradients.brandPrimary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center justify-center" style={{ paddingVertical: spacing.md, borderRadius: radius.lg }}>
              {translateMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : (<><Languages size={16} color="#fff" strokeWidth={2} /><Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: '#fff', marginLeft: spacing.sm }}>Translate Transcript</Text></>)}
            </LinearGradient>
          </Pressable>

          {translateMut.isPending && (
             <View className="flex-row items-center mt-4 p-3 rounded-xl bg-muted" style={{ backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.subtle }}>
                <ActivityIndicator size="small" color={brand.orange} />
                <View className="ml-3">
                   <Text style={{ fontSize: 12, fontFamily: typography.fontFamily.semibold, color: colors.text.primary }}>Translating...</Text>
                   <Text style={{ fontSize: 10, color: colors.text.muted }}>{translateProgress}</Text>
                </View>
             </View>
          )}
        </View>
        
        {/* AI Summary and Export sections would go here similarly... */}
        </ScrollView>
    </View>
  );
}
