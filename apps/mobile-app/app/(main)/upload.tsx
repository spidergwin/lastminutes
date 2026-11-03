import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import {
  Menu, Upload, Link2, FileAudio, ChevronDown,
  X, CheckCircle, FileUp,
} from 'lucide-react-native';
import { useCreateTranscript } from '../../hooks/useTranscripts';
import { apiFetch } from '../../constants/api';
import { brand, typography, spacing, radius } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { CustomModal } from '../../components/ui/Modal';
import type { GradientTuple } from '../../constants/theme';
import type { ColorValue } from 'react-native';

/** Helper to cast our gradient tuples to the type LinearGradient expects */
function gradientColors(tuple: GradientTuple): readonly [ColorValue, ColorValue, ...ColorValue[]] {
  return tuple as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]];
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ig', name: 'Igbo (Coming Soon)' },
  { code: 'yo', name: 'Yoruba (Coming Soon)' },
  { code: 'ha', name: 'Hausa (Coming Soon)' },
  { code: 'pid', name: 'Nigerian Pidgin (Coming Soon)' },
  { code: 'multi', name: 'Multi-language (Code-switching - Coming Soon)' },
];

const SUPPORTED_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/m4a', 'audio/x-m4a', 'audio/mp4',
  'audio/flac', 'audio/ogg', 'audio/webm',
  'video/webm', 'video/mp4',
];

type Tab = 'upload' | 'url';

interface PickedFile {
  name: string;
  uri: string;
  mimeType: string;
  size: number;
}

export default function UploadScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const createMut = useCreateTranscript();

  const [tab, setTab] = useState<Tab>('upload');
  const [language, setLanguage] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{ text: string; wordCount: number; segments?: any[]; speakers?: string[]; duration?: number } | null>(null);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  const showError = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  const handleFilePick = async () => {
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_TYPES,
        copyToCacheDirectory: true,
      });

      if (docResult.canceled || !docResult.assets?.length) return;

      const asset = docResult.assets[0];
      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'audio/mpeg',
        size: asset.size ?? 0,
      });
      setResult(null);
    } catch (err) {
      console.error('File pick error:', err);
      showError('Error', 'Failed to pick file. Please try again.');
    }
  };

  const handleFileUpload = async () => {
    if (!pickedFile) return;
    setProcessing(true);
    setUploadProgress(0);
    setResult(null);
    try {
      // 1. Get pre-signed URL from Next.js API
      const presignedRes = await apiFetch('/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: pickedFile.name,
          contentType: pickedFile.mimeType,
        }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok || !presignedData.success) {
        throw new Error(presignedData.error || "Failed to initialize upload.");
      }

      const { uploadUrl, publicUrl } = presignedData;

      // 2. Upload file directly to S3 via PUT request using XMLHttpRequest for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percentage);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted.")));

        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", pickedFile.mimeType);
        
        // React Native fetch/XHR with file URI
        xhr.send({ uri: pickedFile.uri, type: pickedFile.mimeType, name: pickedFile.name } as any);
      });

      // 2. Submit the resulting URL to the Next.js Transcription API
      const response = await apiFetch('/transcription/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: publicUrl,
          language: language,
          wait: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Transcription failed');
      }

      const data = await response.json();
      const payload = data.data || data;
      const text = payload.text || '';
      setResult({ 
        text, 
        wordCount: text.split(/\s+/).filter(Boolean).length,
        segments: payload.segments,
        speakers: payload.speakers,
        duration: payload.duration,
      });
    } catch (err: any) {
      showError('Upload Error', err?.message || 'Failed to transcribe the file. Please try again.');
    } finally {
      setProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleUrlTranscribe = async () => {
    if (!url.trim()) return;
    setProcessing(true);
    setResult(null);
    try {
      const response = await apiFetch('/transcription/upload', {
        method: 'POST',
        body: JSON.stringify({ audio_url: url.trim(), language, wait: true }),
      });
      if (!response.ok) throw new Error('Transcription failed');
      const data = await response.json();
      const payload = data.data || data;
      const text = payload.text || '';
      setResult({ 
        text, 
        wordCount: text.split(/\s+/).filter(Boolean).length,
        segments: payload.segments,
        speakers: payload.speakers,
        duration: payload.duration,
      });
    } catch (err: any) {
      showError('Transcription Error', err?.message || 'Failed to transcribe the URL. Check the URL and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const source = tab === 'upload' ? pickedFile?.name : url;
      const res = await createMut.mutateAsync({
        title: `${tab === 'upload' ? 'File' : 'URL'} Transcript — ${new Date().toLocaleDateString()}`,
        originalText: result.text,
        sourceLanguage: language,
        segments: result.segments,
        speakers: result.speakers,
        duration: result.duration,
      });
      const newId = res.data?.id || res.id;
      if (newId) router.replace(`/(main)/transcript/${newId}` as any);
      else router.back();
    } catch {
      showError('Error', 'Failed to save transcript.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: insets.top + spacing.sm, paddingBottom: spacing['4xl'] }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.lg }}>
          <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} className="items-center justify-center" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface.hover }} hitSlop={12}>
            <Menu size={22} color={colors.text.secondary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <Text style={{ fontSize: typography.size.xl, fontFamily: typography.fontFamily.bold, color: colors.text.primary, letterSpacing: typography.letterSpacing.tight }}>Upload & Transcribe</Text>
        <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, color: colors.text.tertiary, marginTop: spacing.xs, marginBottom: spacing.xl }}>
          Upload an audio file or paste a URL to transcribe.
        </Text>

        {/* Tab Switcher */}
        <View className="flex-row" style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: 4, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.surface.cardBorder }}>
          {(['upload', 'url'] as Tab[]).map(t => (
            <Pressable key={t} onPress={() => { setTab(t); setResult(null); setPickedFile(null); }} className="flex-1 flex-row items-center justify-center"
              style={[{ paddingVertical: spacing.md, borderRadius: radius.md }, tab === t && { backgroundColor: brand.orangeMuted }]}>
              {t === 'upload' ? <Upload size={16} color={tab === t ? brand.orange : colors.text.muted} strokeWidth={1.5} /> : <Link2 size={16} color={tab === t ? brand.orange : colors.text.muted} strokeWidth={1.5} />}
              <Text style={{ fontSize: typography.size.sm, fontFamily: tab === t ? typography.fontFamily.semibold : typography.fontFamily.medium, color: tab === t ? brand.orange : colors.text.tertiary, marginLeft: spacing.sm }}>
                {t === 'upload' ? 'File Upload' : 'From URL'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Language Selector */}
        <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>Transcription Language</Text>
        <Pressable onPress={() => setShowLangPicker(!showLangPicker)} className="flex-row items-center justify-between"
          style={{ backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.base, paddingVertical: spacing.md, marginBottom: showLangPicker ? 0 : spacing.xl }}>
          <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.medium, color: colors.text.primary }}>{LANGUAGES.find(l => l.code === language)?.name}</Text>
          <ChevronDown size={16} color={colors.text.muted} />
        </Pressable>
        {showLangPicker && (
          <View style={{ backgroundColor: colors.bg.elevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, marginBottom: spacing.xl, maxHeight: 200 }}>
            <ScrollView nestedScrollEnabled>
              {LANGUAGES.map(l => (
                <Pressable key={l.code} onPress={() => { setLanguage(l.code); setShowLangPicker(false); }}
                  style={[{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }, language === l.code && { backgroundColor: brand.orangeMuted }]}>
                  <Text style={{ fontSize: typography.size.sm, fontFamily: language === l.code ? typography.fontFamily.semibold : typography.fontFamily.regular, color: language === l.code ? brand.orange : colors.text.primary }}>{l.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upload Tab */}
        {tab === 'upload' && (
          <View style={{ marginBottom: spacing.xl }}>
            {/* File Picker Area */}
            <Pressable onPress={handleFilePick}
              style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 2, borderColor: pickedFile ? brand.orange + '40' : colors.border.default, borderStyle: 'dashed' as any, padding: spacing['3xl'], alignItems: 'center' as const, marginBottom: spacing.base }}>
              <View className="items-center justify-center" style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: brand.orangeMuted, marginBottom: spacing.base }}>
                <FileAudio size={28} color={brand.orange} strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: typography.size.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
                {pickedFile ? 'Tap to change file' : 'Tap to select a file'}
              </Text>
              <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, color: colors.text.tertiary, textAlign: 'center' }}>
                MP3, WAV, M4A, FLAC, OGG, WEBM{'\n'}Max 2.5GB
              </Text>
            </Pressable>

            {/* Selected file info */}
            {pickedFile && (
              <View className="flex-row items-center" style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: brand.orange + '30', padding: spacing.md, marginBottom: spacing.base }}>
                <FileUp size={18} color={brand.orange} strokeWidth={1.5} />
                <View className="flex-1" style={{ marginLeft: spacing.sm }}>
                  <Text numberOfLines={1} style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: colors.text.primary }}>{pickedFile.name}</Text>
                  <Text style={{ fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, color: colors.text.muted }}>{formatFileSize(pickedFile.size)}</Text>
                </View>
                <Pressable onPress={() => setPickedFile(null)} hitSlop={8}>
                  <X size={16} color={colors.text.muted} />
                </Pressable>
              </View>
            )}

            {/* Upload button */}
            <Pressable onPress={handleFileUpload} disabled={processing || !pickedFile} className="overflow-hidden" style={({ pressed }) => [{ borderRadius: radius.lg, opacity: (!pickedFile || processing) ? 0.5 : 1 }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={gradientColors(gradients.brandPrimary)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center justify-center" style={{ paddingVertical: spacing.md, borderRadius: radius.lg }}>
                {processing ? <ActivityIndicator size="small" color="#fff" /> : (<><Upload size={16} color="#fff" strokeWidth={2} /><Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: '#fff', marginLeft: spacing.sm }}>Upload & Transcribe</Text></>)}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* URL Tab */}
        {tab === 'url' && (
          <View style={{ marginBottom: spacing.xl }}>
            <View className="flex-row items-center" style={{ backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, marginBottom: spacing.base }}>
              <Link2 size={16} color={colors.text.muted} />
              <TextInput className="flex-1" value={url} onChangeText={setUrl} placeholder="https://example.com/audio.mp3" placeholderTextColor={colors.text.muted}
                style={{ color: colors.text.primary, marginLeft: spacing.sm, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, paddingVertical: spacing.md }}
                autoCapitalize="none" keyboardType="url" />
              {url.length > 0 && (
                <Pressable onPress={() => setUrl('')}><X size={16} color={colors.text.muted} /></Pressable>
              )}
            </View>
            <Pressable onPress={handleUrlTranscribe} disabled={processing || !url.trim()} className="overflow-hidden" style={({ pressed }) => [{ borderRadius: radius.lg, opacity: (!url.trim() || processing) ? 0.5 : 1 }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={gradientColors(gradients.brandPrimary)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center justify-center" style={{ paddingVertical: spacing.md, borderRadius: radius.lg }}>
                {processing ? <ActivityIndicator size="small" color="#fff" /> : (<><Upload size={16} color="#fff" strokeWidth={2} /><Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: '#fff', marginLeft: spacing.sm }}>Transcribe URL</Text></>)}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Processing */}
        {processing && (
          <View className="items-center" style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 1, borderColor: brand.orangeMuted, padding: spacing.xl, marginBottom: spacing.xl }}>
            <ActivityIndicator size="large" color={brand.orange} />
            <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.medium, color: colors.text.secondary, marginTop: spacing.md }}>
              {uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Transcribing audio...'}
            </Text>
            <Text style={{ fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, color: colors.text.muted, marginTop: spacing.xs }}>This may take a moment</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={{ backgroundColor: colors.bg.secondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.success + '40', padding: spacing.lg, marginBottom: spacing.xl }}>
            <View className="flex-row items-center" style={{ marginBottom: spacing.base }}>
              <CheckCircle size={18} color={colors.success} strokeWidth={2} />
              <Text style={{ fontSize: typography.size.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginLeft: spacing.sm }}>Transcription Complete</Text>
            </View>
            <Text style={{ fontSize: typography.size.xs, fontFamily: typography.fontFamily.medium, color: colors.text.muted, marginBottom: spacing.sm }}>{result.wordCount} words</Text>
            <Text numberOfLines={8} style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular, color: colors.text.secondary, lineHeight: typography.size.sm * 1.7, marginBottom: spacing.lg }}>{result.text}</Text>
            <Pressable onPress={handleSave} disabled={createMut.isPending} className="overflow-hidden" style={{ borderRadius: radius.lg }}>
              <LinearGradient colors={gradientColors(gradients.brandPrimary)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center justify-center" style={{ paddingVertical: spacing.md, borderRadius: radius.lg }}>
                {createMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: '#fff' }}>Save & View Transcript</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Styled Error Modal */}
      <CustomModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        headerIcon={
          <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <X size={24} color="#EF4444" strokeWidth={2} />
          </View>
        }
        title={errorModal.title}
        message={errorModal.message}
        actions={[
          {
            label: 'Dismiss',
            variant: 'primary',
            onPress: () => setErrorModal({ ...errorModal, visible: false })
          }
        ]}
      />
    </View>
  );
}
