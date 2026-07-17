import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useFmt } from '@/hooks/useFmt';

const PLAN_COLORS = {
  comfortable: { border: '#4CAF50', bg: '#1B4332', text: '#4CAF50', gradient: ['#4CAF50', '#66BB6A'] as [string, string] },
  balanced: { border: '#FFC107', bg: '#3D2B00', text: '#FFC107', gradient: ['#FFC107', '#FFD54F'] as [string, string] },
  fast: { border: '#FF6B6B', bg: '#3D0000', text: '#FF6B6B', gradient: ['#FF6B6B', '#FFA07A'] as [string, string] },
};

export default function SuccessScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { num, digits } = useFmt();
  const { planName, planType, months, monthlySaving, description } = useLocalSearchParams<{
    planName: string;
    planType: string;
    months: string;
    monthlySaving: string;
    description: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const planConfig =
    PLAN_COLORS[(planType as keyof typeof PLAN_COLORS) ?? 'balanced'] ??
    PLAN_COLORS.balanced;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: '#1B4332',
              borderColor: '#4CAF50',
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <MaterialCommunityIcons name="check-circle" size={56} color="#4CAF50" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            تم تفعيل خطتك بنجاح
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            يسعدنا دعمك في رحلتك المالية مع بنك الإنماء
          </Text>

          {/* Plan details card */}
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: planConfig.border,
              },
            ]}
          >
            {/* Plan name badge */}
            <View style={[styles.badge, { backgroundColor: planConfig.bg }]}>
              <Text style={[styles.badgeText, { color: planConfig.text }]}>
                خطة {planName}
              </Text>
            </View>

            {/* Monthly savings */}
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                الادخار الشهري
              </Text>
              <View style={styles.statValue}>
                <Text style={[styles.statAmount, { color: colors.foreground }]}>
                  {num(Number(monthlySaving))}
                </Text>
                <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>
                  ريال
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Duration */}
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                مدة الخطة
              </Text>
              <View style={styles.statValue}>
                <Text style={[styles.statAmount, { color: colors.foreground }]}>
                  {digits(Number(months))}
                </Text>
                <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>
                  شهر
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Description */}
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {description}
            </Text>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaWrapper}
            onPress={() => router.dismissAll()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={planConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>العودة للرئيسية</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  planCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  badge: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  statValue: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
  },
  statAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  statUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  divider: {
    height: 1,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 22,
    paddingTop: 14,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cta: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  ctaText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
});
