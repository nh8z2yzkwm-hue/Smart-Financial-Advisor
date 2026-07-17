import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

type IconName = 'mobile' | 'transfer' | 'bills' | 'advisor';

interface ServiceCardProps {
  icon: IconName;
  title: string;
  onPress: () => void;
  isAI?: boolean;
}

function ServiceIcon({ icon, color, size }: { icon: IconName; color: string; size: number }) {
  switch (icon) {
    case 'mobile':
      return <MaterialCommunityIcons name="cellphone" size={size} color={color} />;
    case 'transfer':
      return <MaterialCommunityIcons name="bank-transfer" size={size} color={color} />;
    case 'bills':
      return <MaterialCommunityIcons name="receipt" size={size} color={color} />;
    case 'advisor':
      return <MaterialCommunityIcons name="creation" size={size} color={color} />;
    default:
      return <Ionicons name="apps" size={size} color={color} />;
  }
}

function AdvisorCard({ title, onPress }: { title: string; onPress: () => void }) {
  // Pulse glow
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Shimmer sweep
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  // Star twinkle
  const star1 = useRef(new Animated.Value(1)).current;
  const star2 = useRef(new Animated.Value(0.4)).current;
  const star3 = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Glow pulse (subtle)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Shimmer sweep
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    // Star twinkles (staggered)
    const twinkle = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.9, duration: 350, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
    twinkle(star1, 0).start();
    twinkle(star2, 500).start();
    twinkle(star3, 1100).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] });
  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.8}
      delayPressIn={0}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >

      <LinearGradient
        colors={['#F2907C', '#E87E68']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.advisorCard}
      >
        {/* Shimmer sweep overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerX }] },
          ]}
        />

        {/* AI badge — top-right */}
        <View style={styles.aiBadge} pointerEvents="none">
          <MaterialCommunityIcons name="star-four-points" size={9} color="#F2907C" />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>

        {/* Sparkle star — top-left */}
        <Animated.View
          pointerEvents="none"
          style={[styles.sparkle, styles.sparkle1, { opacity: star1 }]}
        >
          <MaterialCommunityIcons name="star-four-points" size={13} color="rgba(255,255,255,0.9)" />
        </Animated.View>

        {/* Sparkle star — bottom-right */}
        <Animated.View
          pointerEvents="none"
          style={[styles.sparkle, styles.sparkle2, { opacity: star2 }]}
        >
          <MaterialCommunityIcons name="star-four-points" size={9} color="rgba(255,255,255,0.7)" />
        </Animated.View>

        {/* Sparkle star — bottom-left */}
        <Animated.View
          pointerEvents="none"
          style={[styles.sparkle, styles.sparkle3, { opacity: star3 }]}
        >
          <MaterialCommunityIcons name="star-four-points" size={11} color="rgba(255,255,255,0.8)" />
        </Animated.View>

        {/* Main icon */}
        <MaterialCommunityIcons name="creation" size={34} color="#fff" />
      </LinearGradient>

      <Text style={[styles.label, { color: '#FFFFFF' }]} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function ServiceCard({ icon, title, onPress, isAI = false }: ServiceCardProps) {
  const colors = useColors();

  if (isAI) {
    return <AdvisorCard title={title} onPress={onPress} />;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.8}
      delayPressIn={0}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.card}>
        <ServiceIcon icon={icon} color="#E8856A" size={28} />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
    marginHorizontal: 8,
  },

  // Regular card
  card: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#0D0A1E',
    borderWidth: 1.5,
    borderColor: 'rgba(232,133,106,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#E8856A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },

  // Advisor card
  glowHalo: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#F2907C',
    transform: [{ scaleX: 1.08 }, { scaleY: 1.06 }],
    zIndex: 0,
  },
  advisorCard: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    zIndex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ skewX: '-20deg' }],
  },

  // AI badge
  aiBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  aiBadgeText: {
    color: '#F2907C',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },

  // Sparkles
  sparkle: { position: 'absolute' },
  sparkle1: { top: 8, left: 8 },
  sparkle2: { bottom: 8, right: 8 },
  sparkle3: { bottom: 10, left: 10 },

  // Label
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 15,
  },
});
