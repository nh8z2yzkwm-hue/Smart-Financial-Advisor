import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { useFmt } from '@/hooks/useFmt';

export type Plan = {
  type: 'comfortable' | 'balanced' | 'fast';
  name: string;
  monthlySaving: number;
  months: number;
  description: string;
};

interface PlanCardProps {
  plan: Plan;
  onSelect: () => void;
  buttonLabel?: string;
}

const PLAN_CONFIG = {
  comfortable: {
    icon: 'emoticon-happy-outline' as const,
    borderColor: '#4CAF50',
    badgeColor: '#1B4332',
    badgeText: '#4CAF50',
    gradientColors: ['#4CAF50', '#66BB6A'] as [string, string],
  },
  balanced: {
    icon: 'scale-balance' as const,
    borderColor: '#FFC107',
    badgeColor: '#3D2B00',
    badgeText: '#FFC107',
    gradientColors: ['#FFC107', '#FFD54F'] as [string, string],
  },
  fast: {
    icon: 'lightning-bolt' as const,
    borderColor: '#FF6B6B',
    badgeColor: '#3D0000',
    badgeText: '#FF6B6B',
    gradientColors: ['#FF6B6B', '#FFA07A'] as [string, string],
  },
};

export default function PlanCard({ plan, onSelect, buttonLabel = 'اختر هذا المسار' }: PlanCardProps) {
  const colors = useColors();
  const { num, digits } = useFmt();
  const config = PLAN_CONFIG[plan.type];

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: config.borderColor,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: config.badgeColor }]}>
          <MaterialCommunityIcons
            name={config.icon}
            size={14}
            color={config.badgeText}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.badgeLabel, { color: config.badgeText }]}>
            {plan.name}
          </Text>
        </View>

        <View style={styles.amountBlock}>
          <Text style={[styles.amountValue, { color: colors.foreground }]}>
            {num(plan.monthlySaving)}
          </Text>
          <Text style={[styles.amountUnit, { color: colors.mutedForeground }]}>
            ريال / شهر
          </Text>
        </View>
      </View>

      {/* Duration */}
      <View style={styles.durationRow}>
        <MaterialCommunityIcons
          name="calendar-month"
          size={16}
          color={colors.mutedForeground}
        />
        <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
          {digits(plan.months)} شهر للوصول للهدف
        </Text>
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.foreground }]}>
        {plan.description}
      </Text>

      {/* CTA Button */}
      <TouchableOpacity onPress={handleSelect} activeOpacity={0.85} style={styles.btnWrapper}>
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>{buttonLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  amountUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  durationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  durationText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 14,
  },
  btnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  btn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});
