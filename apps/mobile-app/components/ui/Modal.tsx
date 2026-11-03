import React, { ReactNode } from 'react';
import { View, Text, Pressable, Modal as RNModal } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { brand } from '../../constants/theme';

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
}

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  headerIcon?: ReactNode;
  children?: ReactNode;
  actions?: ModalAction[];
}

export function CustomModal({ visible, onClose, title, message, headerIcon, children, actions }: CustomModalProps) {
  const { colors } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade">
      <Pressable 
        className="flex-1 justify-center items-center" 
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} 
        onPress={onClose}
      >
        <Pressable 
          className="w-[80%] max-w-sm rounded-2xl p-6" 
          style={{ backgroundColor: colors.surface.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 }}
          onPress={(e) => e.stopPropagation()}
        >
          {headerIcon && (
            <View className="items-center mb-4">
              {headerIcon}
            </View>
          )}

          {(title || message) && (
            <View className="items-center mb-4">
              {title && (
                <Text className="text-lg text-center" style={{ fontFamily: 'Inter_600SemiBold', color: colors.text.primary, marginBottom: 8 }}>
                  {title}
                </Text>
              )}
              {message && (
                <Text className="text-sm text-center leading-5" style={{ fontFamily: 'Inter_400Regular', color: colors.text.secondary }}>
                  {message}
                </Text>
              )}
            </View>
          )}

          {children && (
            <View className="mb-4">
              {children}
            </View>
          )}

          {actions && actions.length > 0 && (
            <View className="gap-y-2 w-full mt-2">
              {actions.map((action, index) => {
                let bgColor = colors.surface.hover;
                let textColor = colors.text.primary;

                if (action.variant === 'primary') {
                  bgColor = brand.orange;
                  textColor = '#FFFFFF';
                } else if (action.variant === 'danger') {
                  bgColor = 'rgba(239, 68, 68, 0.1)';
                  textColor = '#EF4444';
                }

                return (
                  <Pressable
                    key={index}
                    onPress={action.onPress}
                    className="flex-row items-center justify-center py-3.5 px-4 rounded-xl"
                    style={({ pressed }) => [{ backgroundColor: bgColor }, pressed && { opacity: 0.8 }]}
                  >
                    {action.icon && <View className="mr-3">{action.icon}</View>}
                    <Text className="text-[15px]" style={{ fontFamily: 'Inter_500Medium', color: textColor }}>
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
