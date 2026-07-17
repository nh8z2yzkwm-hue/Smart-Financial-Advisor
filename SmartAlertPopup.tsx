import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SmartAlertPopupProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenAdvisor: () => void;
}

// ─── Design tokens (lifted straight from Frame 30) ───────────────────────────
const CARD_BG      = '#1C2236';   // dark navy card
const DIVIDER      = '#2A3150';   // subtle blue-grey line
const TITLE_COLOR  = '#D4785C';   // Alinma coral / light-orange brand colour
const BODY_COLOR   = '#FFFFFF';   // pure white body text
const BTN_BG       = '#263048';   // slightly darker pill background
const BTN_BORDER   = '#334060';   // soft pill border
const WARN_YELLOW  = '#F5C518';   // warning triangle
// ─────────────────────────────────────────────────────────────────────────────

export default function SmartAlertPopup({
  visible,
  onDismiss,
  onOpenAdvisor,
}: SmartAlertPopupProps) {
  const scale   = useRef(new Animated.Value(0.90)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 68,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.90);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Dim backdrop — tap anywhere to dismiss */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onDismiss}>

        <Animated.View style={[s.card, { transform: [{ scale }], opacity }]}>

          {/* ── HEADER ─────────────────────────────────────────── */}
          <View style={s.header}>
            {/* RTL row: warning icon (left) + coral title (right) */}
            <Ionicons name="warning" size={20} color={WARN_YELLOW} />
            <Text style={s.title}>تنبيه مالي ذكي</Text>
          </View>

          {/* ── DIVIDER 1 ──────────────────────────────────────── */}
          <View style={s.divider} />

          {/* ── BODY ───────────────────────────────────────────── */}
          <View style={s.body}>
            <Text style={s.bodyText}>
              {'فرح، رصدنا ارتفاع ملحوظ في مصاريف التسوق\nهذا الأسبوع 45%\nهل ترغب في تعديل خطتك لتجنب العجز؟'}
            </Text>
          </View>

          {/* ── DIVIDER 2 ──────────────────────────────────────── */}
          <View style={s.divider} />

          {/* ── BUTTONS ────────────────────────────────────────── */}
          <View style={s.btnsRow}>

            {/* Left pill: dismiss */}
            <TouchableOpacity style={s.pill} onPress={onDismiss} activeOpacity={0.75}>
              <Text style={s.pillText}>تجاهل التنبيه</Text>
            </TouchableOpacity>

            {/* Right pill: open advisor — icon on RIGHT of text (RTL trailing) */}
            <TouchableOpacity style={s.pill} onPress={onOpenAdvisor} activeOpacity={0.75}>
              <Text style={s.pillText}>ادخل للمستشار</Text>
              <Ionicons
                name="chatbubble-ellipses"
                size={15}
                color="#FFFFFF"
                style={{ marginRight: 7 }}
              />
            </TouchableOpacity>

          </View>

        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  /* ── Backdrop ── */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  /* ── Card ── */
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: 'hidden',          // clips children to rounded corners
    ...Platform.select({
      ios: {
        shadowColor: '#6B8CFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 32,
      },
      android: { elevation: 18 },
      web: {
        boxShadow: '0 0 0 1px rgba(107,140,255,0.18), 0 0 32px 6px rgba(107,140,255,0.18), 0 12px 40px rgba(0,0,0,0.65)',
      } as any,
    }),
  },

  /* ── Header section ── */
  header: {
    flexDirection: 'row',         // icon on left, title on right (LTR row)
    alignItems: 'center',
    justifyContent: 'flex-end',   // push both to right edge (RTL feel)
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: TITLE_COLOR,
    textAlign: 'right',
  },

  /* ── Divider ── */
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginHorizontal: 0,          // edge-to-edge inside card
  },

  /* ── Body section ── */
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 28,
    fontFamily: 'Inter_400Regular',
    color: BODY_COLOR,
    textAlign: 'center',
  },

  /* ── Buttons row ── */
  btnsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },

  /* Pill button */
  pill: {
    flex: 1,
    height: 50,
    borderRadius: 999,            // full pill
    backgroundColor: BTN_BG,
    borderWidth: 1,
    borderColor: BTN_BORDER,
    flexDirection: 'row-reverse', // icon on right of text in RTL
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#6B8CFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: '0 0 14px 2px rgba(107,140,255,0.22), 0 2px 8px rgba(0,0,0,0.40)',
      } as any,
    }),
  },
  pillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
