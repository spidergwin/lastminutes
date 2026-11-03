import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, CreditCard, Zap, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../hooks/useTheme';
import { useUsage } from '../../../hooks/useTranscripts';
import { brand, typography, spacing, radius } from '../../../constants/theme';

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Pro Trial",
    monthlyLimit: 120,
    price: 0,
    currency: "₦",
    features: ["2 hours of transcription", "Real-time streaming", "File uploads (up to 2GB)", "Global languages", "AI summaries & translation", "Google Calendar & Drive sync"],
  },
  PRO: {
    name: "Pro",
    monthlyLimit: 900,
    price: 15000,
    currency: "₦",
    features: ["Up to 15 hours of transcription / mo", "Real-time streaming + file uploads", "Global Languages + Code-switching", "AI summaries & action items", "DOCX, PDF, SRT, VTT export", "Speaker diarization", "Google Calendar & Drive Integration", "Unlimited translations"],
  },
  BUSINESS: {
    name: "Business",
    monthlyLimit: 3000,
    price: 45000,
    currency: "₦",
    features: ["Up to 50 hours of transcription / mo", "Everything that pro offers"],
  },
} as const;

export function formatPrice(price: number, currency: string = "₦"): string {
  return `${currency}${price.toLocaleString()}`;
}

export default function BillingScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: usageData, isLoading } = useUsage();

  const currentPlanKey = (usageData?.subscription?.plan || "FREE") as keyof typeof SUBSCRIPTION_PLANS;
  const currentPlan = SUBSCRIPTION_PLANS[currentPlanKey];
  const usedMinutes = usageData?.usage?.monthlyDictationMins || 0;
  const limitMinutes = currentPlan.monthlyLimit;
  const usagePercent = Math.min(100, (usedMinutes / limitMinutes) * 100);

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
            Billing & Usage
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.xl, paddingBottom: 64 }}>
        <Text className="text-sm mb-6" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>
          Manage your subscription and track usage.
        </Text>

        {isLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="large" color={brand.orange} />
          </View>
        ) : (
          <>
            {/* Current Plan Card */}
            <View className="rounded-xl overflow-hidden mb-8" style={{ backgroundColor: brand.orangeMuted, borderWidth: 1, borderColor: brand.orange }}>
              <View className="p-5">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <CreditCard size={20} color={brand.orange} strokeWidth={1.8} />
                    <Text className="text-lg ml-2" style={{ fontFamily: 'Inter_600SemiBold', color: brand.orange }}>Current Plan</Text>
                  </View>
                  <View className="px-3 py-1 rounded-full" style={{ backgroundColor: brand.orange }}>
                    <Text className="text-[10px] text-white uppercase tracking-wider" style={{ fontFamily: 'Inter_700Bold' }}>{currentPlan.name}</Text>
                  </View>
                </View>

                <View className="flex-row items-baseline mb-6">
                  <Text className="text-4xl" style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}>
                    {formatPrice(currentPlan.price, currentPlan.currency)}
                  </Text>
                  <Text className="text-sm ml-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}>/month</Text>
                </View>

                <View className="space-y-2 mb-6">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm" style={{ fontFamily: 'Inter_500Medium', color: colors.text.secondary }}>Monthly Usage</Text>
                    <Text className="text-sm" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>
                      {usedMinutes} / {limitMinutes} mins
                    </Text>
                  </View>
                  <View className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.border.default }}>
                    <LinearGradient
                      colors={[...gradients.brandPrimary]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ width: `${usagePercent}%`, height: '100%' }}
                    />
                  </View>
                </View>

                <View className="flex-row justify-between gap-3">
                  <View className="flex-1 p-3 rounded-lg items-center" style={{ backgroundColor: colors.bg.primary }}>
                    <Text className="text-xl" style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}>{usageData?.monthlyTranscripts || 0}</Text>
                    <Text className="text-[10px] mt-1 text-center" style={{ fontFamily: 'Inter_500Medium', color: colors.text.tertiary }}>Transcripts</Text>
                  </View>
                  <View className="flex-1 p-3 rounded-lg items-center" style={{ backgroundColor: colors.bg.primary }}>
                    <Text className="text-xl" style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}>{usageData?.usage?.monthlyTranslations || 0}</Text>
                    <Text className="text-[10px] mt-1 text-center" style={{ fontFamily: 'Inter_500Medium', color: colors.text.tertiary }}>Translations</Text>
                  </View>
                  <View className="flex-1 p-3 rounded-lg items-center" style={{ backgroundColor: colors.bg.primary }}>
                    <Text className="text-xl" style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}>{usageData?.usage?.totalDictationMins || 0}</Text>
                    <Text className="text-[10px] mt-1 text-center" style={{ fontFamily: 'Inter_500Medium', color: colors.text.tertiary }}>Total Mins</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Available Plans */}
            <View className="flex-row items-center mb-4">
              <Zap size={20} color={brand.orange} strokeWidth={1.8} />
              <Text className="text-lg ml-2" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>Available Plans</Text>
            </View>
            
            <View style={{ gap: spacing.md }}>
              {(Object.entries(SUBSCRIPTION_PLANS) as [string, typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS]][]).map(([key, plan]) => {
                const isCurrentPlan = key === currentPlanKey;
                const isPro = key === "PRO";
                
                return (
                  <View key={key} className="p-5 rounded-xl border relative" style={{ 
                    backgroundColor: isCurrentPlan ? colors.surface.hover : colors.bg.secondary,
                    borderColor: isCurrentPlan ? brand.orange : (isPro ? brand.orange + '40' : colors.surface.cardBorder)
                  }}>
                    {isCurrentPlan && (
                      <View className="absolute -top-3 right-4 px-3 py-1 rounded-full" style={{ backgroundColor: brand.orange }}>
                        <Text className="text-[10px] text-white uppercase tracking-wider" style={{ fontFamily: 'Inter_700Bold' }}>Current</Text>
                      </View>
                    )}
                    {!isCurrentPlan && isPro && (
                      <LinearGradient
                        colors={[...gradients.brandPrimary]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        className="absolute -top-3 right-4 px-3 py-1 rounded-full"
                      >
                        <Text className="text-[10px] text-white uppercase tracking-wider" style={{ fontFamily: 'Inter_700Bold' }}>Recommended</Text>
                      </LinearGradient>
                    )}

                    <Text className="text-lg mb-2" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}>{plan.name}</Text>
                    
                    <View className="flex-row items-baseline mb-1">
                      <Text className="text-2xl" style={{ fontFamily: 'Inter_700Bold', color: colors.text.primary }}>
                        {formatPrice(plan.price, plan.currency)}
                      </Text>
                      <Text className="text-xs ml-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}>/mo</Text>
                    </View>
                    <Text className="text-xs mb-4" style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}>
                      {plan.monthlyLimit} mins/month
                    </Text>

                    <View className="space-y-2 mb-5">
                      {plan.features.map(feature => (
                        <View key={feature} className="flex-row items-start mb-2">
                          <Check size={14} color={brand.orange} strokeWidth={2} style={{ marginTop: 2 }} />
                          <Text className="text-xs ml-2 flex-1" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      disabled={isCurrentPlan}
                      className="items-center justify-center py-3 rounded-lg overflow-hidden"
                      style={[{ backgroundColor: isCurrentPlan ? colors.surface.cardBorder : colors.bg.primary, borderWidth: isCurrentPlan ? 0 : 1, borderColor: colors.border.default }]}
                    >
                      {isPro && !isCurrentPlan ? (
                        <LinearGradient colors={[...gradients.brandPrimary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="absolute inset-0 items-center justify-center">
                          <Text className="text-sm text-white" style={{ fontFamily: 'Inter_600SemiBold' }}>Upgrade</Text>
                        </LinearGradient>
                      ) : (
                        <Text className="text-sm" style={{ fontFamily: 'Inter_600SemiBold', color: isCurrentPlan ? colors.text.tertiary : colors.text.primary }}>
                          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
