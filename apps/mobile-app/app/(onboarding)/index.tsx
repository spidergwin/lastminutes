import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Brain, CloudOff, ArrowRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../store/onboarding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand, typography, spacing, radius, shadows, Gradients } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: readonly string[];
  accentColor: string;
}

const getSlides = (gradients: Gradients): Slide[] => [
  {
    id: '1',
    title: 'Record\nAnywhere',
    subtitle: 'CAPTURE YOUR THOUGHTS',
    description: 'Start dictating with a single tap. Your voice is captured in crystal-clear quality, ready for transcription.',
    icon: <Mic size={40} color="#fff" strokeWidth={1.5} />,
    gradient: [...gradients.onboarding1],
    accentColor: brand.orange,
  },
  {
    id: '2',
    title: 'AI-Powered\nTranscription',
    subtitle: 'INTELLIGENT PROCESSING',
    description: 'Advanced AI converts your recordings into accurate text with speaker detection, summaries, and translations.',
    icon: <Brain size={40} color="#fff" strokeWidth={1.5} />,
    gradient: [...gradients.onboarding2],
    accentColor: '#3B82F6',
  },
  {
    id: '3',
    title: 'Works\nOffline',
    subtitle: 'ALWAYS READY',
    description: 'Record even without internet. Your recordings sync automatically when you reconnect.',
    icon: <CloudOff size={40} color="#fff" strokeWidth={1.5} />,
    gradient: [...gradients.onboarding3],
    accentColor: '#22C55E',
  },
];

export default function OnboardingScreen() {
  const { colors, gradients } = useTheme();
  const slides = React.useMemo(() => getSlides(gradients), [gradients]);
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const { completeOnboarding } = useOnboardingStore();

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    router.replace('/(auth)/login');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(auth)/login');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    return (
      <View className="justify-center" style={{ width, height, paddingHorizontal: spacing['2xl'] }}>
        <LinearGradient
          colors={item.gradient as unknown as readonly [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Decorative elements */}
        <View className="absolute inset-0 items-center justify-center">
          <View
            className="absolute rounded-full"
            style={{
              width: 200, height: 200,
              borderWidth: 1, borderColor: item.accentColor + '15',
              top: height * 0.15,
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              width: 320, height: 320,
              borderWidth: 1, borderColor: item.accentColor + '10',
              top: height * 0.09,
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              width: 440, height: 440,
              borderWidth: 1, borderColor: item.accentColor + '08',
              top: height * 0.03,
            }}
          />
        </View>

        {/* Icon */}
        <View className="items-center" style={{ marginBottom: spacing['3xl'], marginTop: height * 0.08 }}>
          <View
            className="items-center justify-center"
            style={{
              width: 140, height: 140, borderRadius: 70,
              backgroundColor: item.accentColor + '12',
            }}
          >
            <View
              className="items-center justify-center"
              style={{
                width: 108, height: 108, borderRadius: 54,
                backgroundColor: item.accentColor + '20',
              }}
            >
              <View
                className="items-center justify-center"
                style={[
                  {
                    width: 76, height: 76, borderRadius: 38,
                    backgroundColor: item.accentColor,
                  },
                  shadows.glow,
                ]}
              >
                {item.icon}
              </View>
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={{ paddingHorizontal: spacing.sm }}>
          <Text
            style={{
              fontSize: typography.size.xs,
              fontFamily: typography.fontFamily.bold,
              letterSpacing: typography.letterSpacing.widest,
              marginBottom: spacing.md,
              color: item.accentColor,
            }}
          >
            {item.subtitle}
          </Text>
          <Text
            style={{
              fontSize: typography.size['3xl'],
              fontFamily: typography.fontFamily.extrabold,
              color: colors.text.primary,
              lineHeight: 44,
              marginBottom: spacing.lg,
              letterSpacing: typography.letterSpacing.tight,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontSize: typography.size.base,
              fontFamily: typography.fontFamily.regular,
              color: colors.text.secondary,
              lineHeight: 24,
              maxWidth: 300,
            }}
          >
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const isLastSlide = activeIndex === slides.length - 1;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Bottom Section */}
      <View
        className="absolute bottom-0 left-0 right-0"
        style={{
          paddingHorizontal: spacing['2xl'],
          paddingBottom: Math.max(insets.bottom, spacing['5xl']),
        }}
      >
        {/* Page Indicators */}
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 6, marginBottom: spacing['2xl'] }}
        >
          {slides.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <RNAnimated.View
                key={index}
                style={{
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: slides[activeIndex].accentColor,
                  height: 4,
                  borderRadius: 2,
                }}
              />
            );
          })}
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center justify-between">
          {isLastSlide ? (
            <Pressable
              onPress={handleGetStarted}
              className="flex-1 overflow-hidden"
              style={({ pressed }) => [
                { borderRadius: radius.full },
                shadows.md,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <LinearGradient
                colors={[brand.orange, brand.orangeLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-row items-center justify-center"
                style={{
                  gap: 10,
                  paddingVertical: 16,
                  borderRadius: radius.full,
                }}
              >
                <Sparkles size={18} color="#fff" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: typography.size.base,
                    fontFamily: typography.fontFamily.semibold,
                  }}
                >
                  Get Started
                </Text>
                <ArrowRight size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleSkip}
                style={{
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <Text
                  style={{
                    color: colors.text.tertiary,
                    fontSize: typography.size.base,
                    fontFamily: typography.fontFamily.medium,
                  }}
                >
                  Skip
                </Text>
              </Pressable>

              <Pressable
                onPress={handleNext}
                className="flex-row items-center"
                style={({ pressed }) => [
                  {
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                    borderRadius: radius.full,
                    backgroundColor: slides[activeIndex].accentColor,
                  },
                  shadows.md,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: typography.size.base,
                    fontFamily: typography.fontFamily.semibold,
                  }}
                >
                  Next
                </Text>
                <ArrowRight size={18} color="#fff" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
