import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, radius } from '../../constants/theme';
import { Save, User, Edit2 } from 'lucide-react-native';
import { CustomModal } from './Modal';

interface Segment {
  text: string;
  speaker: string | number;
  start: number;
  end: number;
  [key: string]: any;
}

interface ConversationEditorProps {
  initialSegments: Segment[];
  initialSpeakers: string[];
  onSave: (newSegments: Segment[], newSpeakers: string[], originalText: string) => Promise<void>;
  isSaving: boolean;
}

export function ConversationEditor({ initialSegments, initialSpeakers, onSave, isSaving }: ConversationEditorProps) {
  const { colors } = useTheme();
  
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [speakers, setSpeakers] = useState<string[]>(initialSpeakers);
  const [hasChanges, setHasChanges] = useState(false);
  const [renameModal, setRenameModal] = useState({ visible: false, oldName: '', newName: '' });

  // Sync state if initial props change
  useEffect(() => {
    setSegments(initialSegments);
    setSpeakers(initialSpeakers);
    setHasChanges(false);
  }, [initialSegments, initialSpeakers]);

  const handleSegmentTextChange = (index: number, newText: string) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], text: newText };
    setSegments(newSegments);
    setHasChanges(true);
  };

  const handleSpeakerRename = (oldName: string) => {
    setRenameModal({ visible: true, oldName, newName: oldName });
  };

  const executeRename = () => {
    const { oldName, newName } = renameModal;
    if (!newName || newName.trim() === '') {
      setRenameModal({ ...renameModal, visible: false });
      return;
    }
    const trimmedName = newName.trim();
    
    // Update speakers list
    const newSpeakers = speakers.map(s => s === oldName ? trimmedName : s);
    
    // Update segments
    const newSegments = segments.map(seg => 
      seg.speaker === oldName ? { ...seg, speaker: trimmedName } : seg
    );
    
    setSpeakers(newSpeakers);
    setSegments(newSegments);
    setHasChanges(true);
    setRenameModal({ visible: false, oldName: '', newName: '' });
  };

  const handleSaveClick = async () => {
    if (!hasChanges) return;

    // Reconstruct the original text to keep it in sync with segments
    const newOriginalText = segments
      .map(seg => {
        let speakerName = seg.speaker;
        // Basic normalization if it's a numeric ID without "Speaker " prefix
        if (typeof speakerName === 'number' || (typeof speakerName === 'string' && /^\d+$/.test(speakerName))) {
           const code = parseInt(speakerName.toString(), 10);
           speakerName = `Speaker ${String.fromCharCode(65 + code)}`;
        }
        return `${speakerName}: ${seg.text}`;
      })
      .join('\n\n');

    await onSave(segments, speakers, newOriginalText);
    setHasChanges(false);
  };

  const normalizeSpeakerName = (speaker: string | number) => {
    if (typeof speaker === 'number' || (typeof speaker === 'string' && /^\d+$/.test(speaker))) {
      const code = parseInt(speaker.toString(), 10);
      return `Speaker ${String.fromCharCode(65 + code)}`;
    }
    return speaker;
  };

  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: typography.size.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary }}>
          Conversation
        </Text>
        {hasChanges && (
          <Pressable 
            onPress={handleSaveClick} 
            disabled={isSaving}
            className="flex-row items-center justify-center px-3 py-1.5 rounded-md"
            style={({ pressed }) => [
              { backgroundColor: colors.surface.hover },
              pressed && { opacity: 0.8 }
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Save size={14} color={colors.text.primary} />
                <Text style={{ marginLeft: spacing.xs, fontSize: typography.size.sm, fontFamily: typography.fontFamily.medium, color: colors.text.primary }}>Save Edits</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <View style={{ gap: spacing.lg }}>
        {segments.map((segment, index) => {
          const speakerName = normalizeSpeakerName(segment.speaker);
          return (
            <View key={index} style={{ marginBottom: spacing.md }}>
              <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.xs }}>
                <Pressable 
                  onPress={() => handleSpeakerRename(segment.speaker.toString())}
                  className="flex-row items-center px-2 py-1 rounded-md"
                  style={{ backgroundColor: colors.bg.input }}
                >
                  <User size={12} color={colors.text.secondary} />
                  <Text style={{ marginLeft: 4, fontSize: typography.size.xs, fontFamily: typography.fontFamily.semibold, color: colors.text.secondary }}>
                    {speakerName}
                  </Text>
                  <Edit2 size={10} color={colors.text.muted} style={{ marginLeft: 6 }} />
                </Pressable>
                
                {segment.start !== undefined && (
                  <Text style={{ fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, color: colors.text.muted }}>
                    {formatTimestamp(segment.start)}
                  </Text>
                )}
              </View>
              
              <TextInput
                multiline
                value={segment.text}
                onChangeText={(text) => handleSegmentTextChange(index, text)}
                style={{
                  fontSize: typography.size.sm,
                  fontFamily: typography.fontFamily.regular,
                  color: colors.text.primary,
                  lineHeight: typography.size.sm * 1.6,
                  padding: spacing.md,
                  backgroundColor: colors.bg.tertiary,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: 'transparent'
                }}
                placeholderTextColor={colors.text.muted}
              />
            </View>
          );
        })}
      </View>

      <CustomModal
        visible={renameModal.visible}
        onClose={() => setRenameModal({ ...renameModal, visible: false })}
        title="Rename Speaker"
        message={`Enter new name for ${renameModal.oldName}`}
        actions={[
          { label: 'Cancel', variant: 'secondary', onPress: () => setRenameModal({ ...renameModal, visible: false }) },
          { label: 'Save', variant: 'primary', onPress: executeRename }
        ]}
      >
        <TextInput
          value={renameModal.newName}
          onChangeText={(text) => setRenameModal({ ...renameModal, newName: text })}
          style={{
            backgroundColor: colors.bg.input,
            color: colors.text.primary,
            borderWidth: 1,
            borderColor: colors.border.default,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.size.sm,
            marginTop: spacing.md
          }}
          autoFocus
        />
      </CustomModal>
    </View>
  );
}
