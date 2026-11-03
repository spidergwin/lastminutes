import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react-native';
import { brand, typography, spacing, radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

interface AudioPlayerProps {
  url: string;
}

export function AudioPlayer({ url }: AudioPlayerProps) {
  const { colors, isDark } = useTheme();
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (status.isLoaded) {
      setIsLoaded(true);
    }
  }, [status.isLoaded]);

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const skip = (seconds: number) => {
    player.seekTo(status.currentTime + seconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  if (!isLoaded) {
    return (
      <View className="p-6 rounded-2xl items-center justify-center border" style={{ backgroundColor: colors.bg.secondary, borderColor: colors.surface.cardBorder }}>
        <ActivityIndicator size="small" color={brand.orange} />
        <Text className="mt-2 text-xs" style={{ fontFamily: typography.fontFamily.medium, color: colors.text.tertiary }}>Loading audio...</Text>
      </View>
    );
  }

  return (
    <View className="p-5 rounded-2xl border" style={{ backgroundColor: colors.bg.secondary, borderColor: colors.surface.cardBorder }}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: brand.orangeMuted }}>
            <Volume2 size={16} color={brand.orange} />
          </View>
          <Text style={{ fontSize: typography.size.sm, fontFamily: typography.fontFamily.semibold, color: colors.text.primary }}>Recording Playback</Text>
        </View>
        <Text style={{ fontSize: 11, fontFamily: typography.fontFamily.medium, color: colors.text.muted }}>
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="h-1.5 w-full rounded-full mb-6 overflow-hidden" style={{ backgroundColor: colors.border.default }}>
        <View 
          className="h-full rounded-full" 
          style={{ 
            backgroundColor: brand.orange, 
            width: `${progress}%` 
          }} 
        />
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-center gap-8">
        <Pressable onPress={() => skip(-10)} hitSlop={10}>
          <RotateCcw size={22} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>

        <Pressable 
          onPress={togglePlayback}
          className="w-14 h-14 rounded-full items-center justify-center shadow-lg"
          style={{ backgroundColor: brand.orange, shadowColor: brand.orange, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          {player.playing ? (
            <Pause size={28} color="#fff" fill="#fff" />
          ) : (
            <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
          )}
        </Pressable>

        <Pressable onPress={() => skip(10)} hitSlop={10}>
          <RotateCw size={22} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
}
