import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CustomModal } from '../../components/ui/Modal';
import { Drawer } from 'expo-router/drawer';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home, Mic, FileText, Settings, LogOut, X, CreditCard, Upload, Calendar,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useNetwork } from '../../hooks/useNetwork';
import { brand, gc } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

// ─── Custom Drawer Content ───────────────────────────────────────
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { isOnline } = useNetwork();
  const [isProfileMenuVisible, setProfileMenuVisible] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const mainItems = [
    { key: 'index', label: 'Dashboard', icon: Home, route: '/(main)' as const },
    { key: 'chat', label: 'AI Chat', icon: Sparkles, route: '/(main)/chat' as const },
    { key: 'record', label: 'New Dictation', icon: Mic, route: '/(main)/record' as const },
    { key: 'transcripts', label: 'Transcripts', icon: FileText, route: '/(main)/transcripts' as const },
    { key: 'upload', label: 'Upload & Transcribe', icon: Upload, route: '/(main)/upload' as const },
    { key: 'meetings', label: 'Meetings', icon: Calendar, route: '/(main)/meetings' as const },
  ];

  const settingsItems = [
    { key: 'settings', label: 'Settings', icon: Settings, route: '/(main)/settings' as const },
    { key: 'billing', label: 'Billing', icon: CreditCard, route: '/(main)/settings/billing' as const },
  ];

  const activeRoute = props.state.routes[props.state.index]?.name;

  const renderMenuItem = (item: { key: string; label: string; icon: any; route: string }) => {
    const isActive = item.key === activeRoute;
    return (
      <Pressable
        key={item.key}
        onPress={() => {
          props.navigation.closeDrawer();
          router.push(item.route as any);
        }}
        className="flex-row items-center px-4 py-3.5 mb-1 rounded-theme-md"
        style={({ pressed }) => [
          isActive && { backgroundColor: colors.drawer.itemActive },
          pressed && !isActive && { backgroundColor: colors.drawer.itemHover },
        ]}
      >
        <item.icon
          size={20}
          color={isActive ? brand.orange : colors.text.tertiary}
          strokeWidth={isActive ? 2 : 1.5}
        />
        <Text
          className="ml-4 text-base"
          style={{
            fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
            color: isActive ? brand.orange : colors.text.secondary,
          }}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.drawer.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 py-4"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.drawer.separator }}
      >
        <Pressable
          onPress={() => router.push('/(main)')}
          className="flex-row items-center"
        >
          <LinearGradient
            colors={gc(gradients.brandPrimary)}
            className="items-center justify-center w-8 h-8 mr-4 overflow-hidden rounded-full"
            style={{ borderRadius: 999 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Mic size={16} color="#fff" strokeWidth={2} />
          </LinearGradient>
          <View>
            <Text
              className="text-md"
              style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
            >
              Last Minutes
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => props.navigation.closeDrawer()}
          className="items-center justify-center w-8 h-8 rounded-full"
          style={{ backgroundColor: colors.surface.hover }}
          hitSlop={12}
        >
          <X size={18} color={colors.text.tertiary} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* Menu */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 16 }}
        scrollEnabled={false}
      >
        <Text
          className="uppercase text-[11px] tracking-wider px-4 py-1.5"
          style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.muted }}
        >
          Main
        </Text>
        {mainItems.map(renderMenuItem)}

        <View
          className="h-px mx-2.5 my-4"
          style={{ backgroundColor: colors.drawer.separator }}
        />

        <Text
          className="uppercase text-[11px] tracking-wider px-4 py-1.5"
          style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.muted }}
        >
          Settings
        </Text>
        {settingsItems.map(renderMenuItem)}
      </DrawerContentScrollView>

      {/* Footer — user profile + sign out */}
      <View className="px-4" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <View className="h-px mx-2.5" style={{ backgroundColor: colors.drawer.separator }} />

        {/* User row */}
        <Pressable
          onPress={() => setProfileMenuVisible(true)}
          className="flex-row items-center px-4 py-4 mb-2"
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <LinearGradient
            colors={gc(gradients.brandPrimary)}
            className="items-center justify-center w-9 h-9 mr-4 overflow-hidden rounded-full"
            style={{ borderRadius: 999 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text
              className="text-[11px] text-white"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {getInitials(user?.name ?? null)}
            </Text>
          </LinearGradient>
          <View className="flex-1">
            <Text
              className="text-base leading-5"
              numberOfLines={1}
              style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary }}
            >
              {user?.name || 'User'}
            </Text>
            <Text
              className="text-xs leading-4"
              numberOfLines={1}
              style={{ fontFamily: 'Inter_400Regular', color: colors.text.muted }}
            >
              {user?.email || ''}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Styled Profile Modal */}
      <CustomModal
        visible={isProfileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        headerIcon={
          <LinearGradient
            colors={gc(gradients.brandPrimary)}
            className="items-center justify-center w-14 h-14 overflow-hidden rounded-full"
            style={{ borderRadius: 999 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text
              className="text-lg text-white"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {getInitials(user?.name ?? null)}
            </Text>
          </LinearGradient>
        }
        title={user?.name || 'User'}
        message={user?.email || ''}
        actions={[
          {
            label: 'Settings',
            variant: 'secondary',
            icon: <Settings size={18} color={colors.text.secondary} strokeWidth={1.5} />,
            onPress: () => {
              setProfileMenuVisible(false);
              props.navigation.closeDrawer();
              router.push('/(main)/settings');
            }
          },
          {
            label: 'Sign out',
            variant: 'danger',
            icon: <LogOut size={18} color="#EF4444" strokeWidth={1.5} />,
            onPress: () => {
              setProfileMenuVisible(false);
              signOut();
            }
          }
        ]}
      />
    </View>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────
export default function MainLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
          backgroundColor: colors.drawer.background,
        },
        overlayColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="chat" options={{ title: 'AI Chat' }} />
      <Drawer.Screen name="record" options={{ title: 'New Dictation' }} />
      <Drawer.Screen name="transcripts" options={{ title: 'Transcripts' }} />
      <Drawer.Screen name="upload" options={{ title: 'Upload & Transcribe' }} />
      <Drawer.Screen name="meetings" options={{ title: 'Meetings' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      <Drawer.Screen name="transcript/[id]" options={{ title: 'Transcript Detail', drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
