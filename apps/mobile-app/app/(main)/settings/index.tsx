import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  User, LogOut, ChevronRight, Globe, Shield, Sun, Moon, Smartphone,
  Menu, Calendar, ArrowRight, CreditCard, ChevronDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../store/auth';
import { useNetwork } from '../../../hooks/useNetwork';
import { useThemeStore, ThemePreference } from '../../../store/theme';
import { brand } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import { useOnboardingStore } from '../../../store/onboarding';

// ─── Section Card ────────────────────────────────────────────────
function SectionCard({
  title, subtitle, icon: Icon, children,
}: {
  title: string; subtitle: string; icon: any; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="overflow-hidden rounded-theme-lg mb-6"
      style={{
        backgroundColor: colors.bg.secondary,
        borderWidth: 1,
        borderColor: colors.surface.cardBorder,
      }}
    >
      <View className="px-6 pt-6 pb-4">
        <View className="flex-row items-center mb-1.5">
          <Icon size={18} color={brand.orange} strokeWidth={1.8} />
          <Text
            className="text-lg ml-2.5"
            style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
          >
            {title}
          </Text>
        </View>
        <Text
          className="text-xs"
          style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
        >
          {subtitle}
        </Text>
      </View>
      <View className="px-6 pb-4">
        {children}
      </View>
    </View>
  );
}

// ─── Settings Row ────────────────────────────────────────────────
function SettingsRow({
  label, sublabel, onPress, isDestructive = false, rightElement,
}: {
  label: string; sublabel?: string; onPress?: () => void;
  isDestructive?: boolean; rightElement?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      className="flex-row items-center justify-between py-4"
      style={({ pressed }) => [pressed && onPress && { opacity: 0.7 }]}
    >
      <View className="flex-1 mr-4">
        <Text
          className="text-sm"
          style={{
            fontFamily: 'Inter_500Medium',
            color: isDestructive ? colors.error : colors.text.primary,
          }}
        >
          {label}
        </Text>
        {sublabel && (
          <Text
            className="text-xs mt-0.5"
            style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
          >
            {sublabel}
          </Text>
        )}
      </View>
      {rightElement || (onPress && <ChevronRight size={16} color={colors.text.muted} />)}
    </Pressable>
  );
}

// ─── Theme Selector ──────────────────────────────────────────────
function ThemeSelector() {
  const { colors } = useTheme();
  const themePreference = useThemeStore((st) => st.themePreference);
  const setThemePreference = useThemeStore((st) => st.setThemePreference);

  const options: { key: ThemePreference; label: string; icon: any }[] = [
    { key: 'system', label: 'Auto', icon: Smartphone },
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <View className="flex-row">
      {options.map((opt, index) => {
        const isActive = themePreference === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setThemePreference(opt.key)}
            className="flex-1 flex-row items-center justify-center py-4 rounded-theme-md"
            style={[
              {
                marginRight: index === options.length - 1 ? 0 : 10,
                backgroundColor: colors.bg.tertiary,
                borderWidth: 1,
                borderColor: 'transparent',
              },
              isActive && {
                backgroundColor: brand.orangeMuted,
                borderColor: brand.orange + '30',
              },
            ]}
          >
            <opt.icon
              size={14}
              color={isActive ? brand.orange : colors.text.muted}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <Text
              className="text-sm ml-2.5"
              style={{
                fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                color: isActive ? brand.orange : colors.text.muted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Settings Screen ─────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { resetOnboarding } = useOnboardingStore();
  const { isOnline } = useNetwork();

  const [language, setLanguage] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Success', 'Settings saved successfully.');
    }, 800);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleOpenWeb = (path: string) => {
    Linking.openURL(`https://last-minutes.vercel.app${path}`);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary, paddingTop: insets.top }}>
      {/* Navbar */}
      <View className="flex-row items-center justify-between px-8 py-2.5">
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
            Settings
          </Text>
        </View>
        <View className="w-[42px] h-[42px]" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <SectionCard title="Profile" subtitle="Your personal information." icon={User}>
          <View className="mt-4">
            <Text
              className="text-sm mb-1.5"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
            >
              Display Name
            </Text>
            <View
              className="px-4 py-4 rounded-theme-md"
              style={{
                backgroundColor: colors.bg.input,
                borderWidth: 1,
                borderColor: colors.border.default,
              }}
            >
              <Text
                className="text-sm"
                style={{ fontFamily: 'Inter_400Regular', color: colors.text.primary }}
              >
                {user?.name || '—'}
              </Text>
            </View>
          </View>
          <View className="mt-4">
            <Text
              className="text-sm mb-1.5"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
            >
              Email Address
            </Text>
            <View
              className="opacity-60 px-4 py-4 rounded-theme-md"
              style={{
                backgroundColor: colors.bg.input,
                borderWidth: 1,
                borderColor: colors.border.default,
              }}
            >
              <Text
                className="text-sm"
                style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
              >
                {user?.email || '—'}
              </Text>
            </View>
            <Text
              className="text-xs mt-1.5"
              style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}
            >
              Email cannot be changed.
            </Text>
          </View>
        </SectionCard>

        {/* Preferences */}
        <SectionCard title="Preferences" subtitle="Configure your default settings." icon={Globe}>
          <View className="mt-4">
            <Text
              className="text-sm mb-1.5"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
            >
              Theme
            </Text>
            <ThemeSelector />
          </View>
          <View className="mt-4">
            <Text
              className="text-sm mb-1.5"
              style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
            >
              Default Transcription Language
            </Text>
            <Pressable
              onPress={() => setShowLangPicker(!showLangPicker)}
              className="flex-row items-center justify-between px-4 py-4 rounded-theme-md"
              style={{
                backgroundColor: colors.bg.input,
                borderWidth: 1,
                borderColor: colors.border.default,
              }}
            >
              <Text
                className="text-sm"
                style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
              >
                {LANGUAGES.find(l => l.code === language)?.name || 'English'}
              </Text>
              <ChevronDown size={16} color={colors.text.muted} />
            </Pressable>
            {showLangPicker && (
              <View
                className="mt-2.5 rounded-theme-md"
                style={{
                  backgroundColor: colors.bg.elevated,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                }}
              >
                {LANGUAGES.map(l => (
                  <Pressable
                    key={l.code}
                    onPress={() => { setLanguage(l.code); setShowLangPicker(false); }}
                    className="px-4 py-4"
                    style={[
                      { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
                      language === l.code && { backgroundColor: brand.orangeMuted },
                    ]}
                  >
                    <Text
                      className="text-sm"
                      style={{
                        fontFamily: language === l.code ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        color: language === l.code ? brand.orange : colors.text.primary,
                      }}
                    >
                      {l.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="overflow-hidden rounded-theme-lg mt-6"
          >
            <LinearGradient
              colors={[...gradients.brandPrimary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              className="flex-row items-center justify-center py-4 rounded-theme-lg"
            >
              <Text
                className="text-sm text-white"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </Pressable>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" subtitle="Manage your account security." icon={Shield}>
          <SettingsRow label="Password" sublabel="Change your account password." onPress={() => { }} />
          <View className="h-px" style={{ backgroundColor: colors.border.subtle }} />
          <SettingsRow
            label="Account Status"
            sublabel="Your account is active and in good standing."
            rightElement={
              <View
                className="rounded-full px-4 py-1"
                style={{
                  backgroundColor: 'rgba(34,197,94,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(34,197,94,0.2)',
                }}
              >
                <Text
                  className="text-xs"
                  style={{ fontFamily: 'Inter_500Medium', color: colors.success }}
                >
                  Active
                </Text>
              </View>
            }
          />
        </SectionCard>

        {/* Integrations */}
        <SectionCard title="Integrations" subtitle="Connect external services to your account." icon={Calendar}>
          <Pressable
            className="flex-row items-center p-5 pl-2 rounded-theme-lg"
            style={({ pressed }) => [
              {
                backgroundColor: colors.bg.primary,
                borderWidth: 1,
                borderColor: colors.border.subtle,
              },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push('/(main)/settings/integrations' as any)}
          >
            <View
              className="items-center justify-center w-10 h-10 mr-4 rounded-theme-lg"
              style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
            >
              <Calendar size={18} color="#3B82F6" strokeWidth={1.8} />
            </View>
            <View className="flex-1 mr-2.5">
              <Text
                className="text-sm"
                style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
              >
                Calendar & Meeting Bot
              </Text>
              <Text
                className="text-xs mt-0.5"
                style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
              >
                Connect Calendars, Meeting Bots, and configure Custom Storage.
              </Text>
            </View>
            <ArrowRight size={16} color={colors.text.muted} />
          </Pressable>
        </SectionCard>

        {/* Billing */}
        <SectionCard title="Billing" subtitle="Manage your subscription and payment methods." icon={CreditCard}>
          <Pressable
            className="flex-row items-center p-5 pl-2 rounded-theme-lg"
            style={({ pressed }) => [
              {
                backgroundColor: colors.bg.primary,
                borderWidth: 1,
                borderColor: colors.border.subtle,
              },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push('/(main)/settings/billing' as any)}
          >
            <View
              className="items-center justify-center w-10 h-10 mr-4 rounded-theme-lg"
              style={{ backgroundColor: brand.orangeMuted }}
            >
              <CreditCard size={18} color={brand.orange} strokeWidth={1.8} />
            </View>
            <View className="flex-1 mr-2.5">
              <Text
                className="text-sm"
                style={{ fontFamily: 'Inter_500Medium', color: colors.text.primary }}
              >
                Billing Portal
              </Text>
              <Text
                className="text-xs mt-0.5"
                style={{ fontFamily: 'Inter_400Regular', color: colors.text.tertiary }}
              >
                Open secure payment portal
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.muted} />
          </Pressable>
        </SectionCard>

        {/* Sign Out */}
        <SectionCard title="Account Actions" subtitle="Sign out of your account securely." icon={LogOut}>
          <Pressable
            className="flex-row items-center p-5 pl-2 rounded-theme-lg"
            style={({ pressed }) => [
              {
                backgroundColor: 'rgba(239,68,68,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.2)',
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSignOut}
          >
            <View
              className="items-center justify-center w-10 h-10 mr-4 rounded-theme-lg"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
            >
              <LogOut size={18} color={colors.error} strokeWidth={1.8} />
            </View>
            <Text
              className="text-sm"
              style={{ fontFamily: 'Inter_600SemiBold', color: colors.error }}
            >
              Sign Out
            </Text>
          </Pressable>
        </SectionCard>

        {/* Footer */}
        <View className="items-center mt-10 pb-8">
          <Text
            className="text-xs"
            style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}
          >
            Last Minutes - Terms and conditions apply.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
