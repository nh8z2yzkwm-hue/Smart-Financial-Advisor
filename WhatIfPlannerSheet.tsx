/**
 * WhatIfPlannerSheet
 * Interactive expense-reduction planner + inline success confirmation.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MockUser, monthlySavings, totalExpenses } from '@/data/mockUsers';
import { SavedPlan } from '@/context/UserContext';
import { useFmt } from '@/hooks/useFmt';
import { fmtNum } from '@/utils/fmt';

// ── Types ────────────────────────────────────────────────────────────────────
interface ExpenseRow {
  key: keyof MockUser['expenses'];
  label: string;
  emoji: string;
  reductions: number[];
}

const ROWS: ExpenseRow[] = [
  { key: 'restaurants', label: 'المطاعم',         emoji: '🍽️', reductions: [0, 10, 25, 50] },
  { key: 'shopping',    label: 'التسوق',          emoji: '🛍️', reductions: [0, 10, 25, 50] },
  { key: 'coffee',      label: 'القهوة والمقاهي', emoji: '☕',  reductions: [0, 25, 50, 75] },
  { key: 'transport',   label: 'المواصلات',       emoji: '🚗',  reductions: [0, 10, 20, 30] },
  { key: 'bills',       label: 'الفواتير',        emoji: '📱',  reductions: [0, 5,  10, 15] },
];

// ── Constants ────────────────────────────────────────────────────────────────
const NAVY   = '#0D1B2A';
const NAVY2  = '#111E2D';
const CARD   = '#132335';
const BORDER = '#1B3048';
const CORAL  = '#E8856A';
const GREEN  = '#4CAF50';
const WHITE  = '#FFFFFF';
const MUTED  = '#5A7A96';
const SEGMENT_ACTIVE   = '#E8856A';
const SEGMENT_INACTIVE = '#1A2F42';

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  user: MockUser;
  onGeneratePlan: (autoMessage: string, adjustedExpenses: MockUser['expenses']) => void;
  onSavePlan: (plan: SavedPlan) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WhatIfPlannerSheet({ visible, onClose, user, onGeneratePlan, onSavePlan }: Props) {
  const insets = useSafeAreaInsets();
  const { num, digits, pct: fmtPct, lang } = useFmt();

  const [selections, setSelections] = useState<Record<string, number>>({
    restaurants: 0, shopping: 0, coffee: 0, transport: 0, bills: 0,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Animation for success view
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSuccess) {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [showSuccess]);

  // Reset when closed
  useEffect(() => {
    if (!visible) {
      setShowSuccess(false);
      setSelections({ restaurants: 0, shopping: 0, coffee: 0, transport: 0, bills: 0 });
    }
  }, [visible]);

  const selectReduction = (key: string, reductionPct: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelections(prev => ({ ...prev, [key]: reductionPct }));
  };

  // ── Live calculations ────────────────────────────────────────────────────
  const { savedPerMonth, adjustedExpenses, lines } = useMemo(() => {
    let saved = 0;
    const lines: string[] = [];
    const adj = { ...user.expenses };

    ROWS.forEach(row => {
      const original = user.expenses[row.key];
      const pct = selections[row.key];
      const saving = Math.round(original * (pct / 100));
      if (pct > 0) {
        saved += saving;
        adj[row.key] = original - saving;
        lines.push(`${row.emoji} ${row.label}: قللت ${fmtNum(pct, lang)}${lang === 'ar' ? '٪' : '%'} ← وفرت ${fmtNum(saving, lang)} ريال/شهر`);
      }
    });

    return { savedPerMonth: saved, adjustedExpenses: adj, lines };
  }, [selections, user.expenses, lang]);

  const baseSavings     = monthlySavings(user);
  const newSavings      = baseSavings + savedPerMonth;
  const remainingAmount = user.targetAmount - user.balance;
  const baseMonths      = remainingAmount > 0 && baseSavings > 0 ? Math.ceil(remainingAmount / baseSavings) : 0;
  const newMonths       = remainingAmount > 0 && newSavings > 0  ? Math.ceil(remainingAmount / newSavings)  : 0;
  const monthsFaster    = baseMonths - newMonths;

  // ── Build AI message ───────────────────────────────────────────────────────
  const buildMessage = (): string => {
    const linesText = lines.length > 0 ? lines.join('\n') : '(لم يتم أي تعديل)';
    return (
      `بناءً على تعديلاتي الشهرية:\n${linesText}\n\n` +
      `إجمالي التوفير الإضافي: ${num(savedPerMonth)} ريال/شهر\n` +
      `ادخاري الجديد: ${num(newSavings)} ريال/شهر\n\n` +
      `هدفي: ${user.savingTarget} (${num(user.targetAmount)} ريال)\n\n` +
      `احسب لي خطة ادخار مخصصة بناءً على هذه التعديلات، وأخبرني كيف سأصل لهدفي بشكل أسرع.`
    );
  };

  const handleGenerate = () => {
    if (savedPerMonth === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Save plan to context
    onSavePlan({
      monthlySaving: newSavings,
      months: newMonths > 0 ? newMonths : 12,
      planType: 'fast',
      adjustedExpenses,
    });
    setShowSuccess(true);
  };

  const handleConfirm = () => {
    onGeneratePlan(buildMessage(), adjustedExpenses);
  };

  if (!visible) return null;

  // ── Success motivation text ───────────────────────────────────────────────
  const motivationText = monthsFaster > 0
    ? `بجهد أكثر شوي تقدرين تحققين الهدف في ${digits(newMonths > 0 ? newMonths : 12)} شهر! 🚀`
    : 'كل ريال توفرينه اليوم هو خطوة نحو هدفك 💪';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={showSuccess ? undefined : onClose} />

        {/* ── Success View ─────────────────────────────────────────────── */}
        {showSuccess ? (
          <View style={[styles.sheet, styles.successSheet, { paddingBottom: insets.bottom + 28 }]}>
            <View style={styles.successContent}>
              {/* Checkmark */}
              <Animated.View style={[styles.successIcon, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialCommunityIcons name="check-circle" size={56} color={GREEN} />
              </Animated.View>

              <Animated.View style={[{ opacity: fadeAnim, alignItems: 'center', width: '100%' }]}>
                <Text style={styles.successTitle}>تم تفعيل خطتك بنجاح</Text>
                <Text style={styles.successSub}>يسعدنا دعمك في رحلتك المالية مع بنك الإنماء</Text>

                {/* Plan card */}
                <View style={styles.successCard}>
                  <View style={styles.successBadge}>
                    <Text style={styles.successBadgeText}>خطة سريعة</Text>
                  </View>

                  <View style={styles.successStatRow}>
                    <Text style={styles.successStatLabel}>الادخار الشهري</Text>
                    <View style={styles.successStatVal}>
                      <Text style={styles.successStatAmount}>{num(newSavings)}</Text>
                      <Text style={styles.successStatUnit}> ريال</Text>
                    </View>
                  </View>

                  <View style={styles.successDivider} />

                  <View style={styles.successStatRow}>
                    <Text style={styles.successStatLabel}>مدة الخطة</Text>
                    <View style={styles.successStatVal}>
                      <Text style={styles.successStatAmount}>
                        {digits(newMonths > 0 ? newMonths : 12)}
                      </Text>
                      <Text style={styles.successStatUnit}> شهر</Text>
                    </View>
                  </View>

                  <View style={styles.successDivider} />

                  <Text style={styles.successMotivation}>{motivationText}</Text>
                </View>

                {/* CTA */}
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>العودة للرئيسية</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        ) : (
          /* ── Planner View ──────────────────────────────────────────────── */
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>خطّط مصاريفك</Text>
                <Text style={styles.headerSub}>اضبط تقليص كل فئة وشوف التوفير</Text>
              </View>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Goal banner */}
              <View style={styles.goalBanner}>
                <View style={styles.goalRight}>
                  <Text style={styles.goalLabel}>هدفك</Text>
                  <Text style={styles.goalName}>{user.savingTarget}</Text>
                </View>
                <Text style={styles.goalAmount}>{num(user.targetAmount)} ر.س</Text>
              </View>

              {/* Expense rows */}
              {ROWS.map(row => {
                const original = user.expenses[row.key];
                const pct      = selections[row.key];
                const saving   = Math.round(original * (pct / 100));
                const newAmt   = original - saving;

                return (
                  <View key={row.key} style={styles.expenseCard}>
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseLeft}>
                        {pct > 0 && (
                          <View style={styles.savingTag}>
                            <Text style={styles.savingTagText}>−{num(saving)} ر.س</Text>
                          </View>
                        )}
                        <Text style={styles.expenseNew}>
                          {num(newAmt)}
                          <Text style={styles.expenseSar}> ر.س</Text>
                        </Text>
                      </View>
                      <View style={styles.expenseRight}>
                        <Text style={styles.expenseEmoji}>{row.emoji}</Text>
                        <View>
                          <Text style={styles.expenseLabel}>{row.label}</Text>
                          <Text style={styles.expenseOriginal}>الحالي: {num(original)} ر.س</Text>
                        </View>
                      </View>
                    </View>

                    {/* Segmented selector */}
                    <View style={styles.segmentRow}>
                      {row.reductions.map(opt => {
                        const active = pct === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.segment, active && styles.segmentActive]}
                            onPress={() => selectReduction(row.key, opt)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                              {opt === 0 ? 'بدون تغيير' : `خفض ${fmtPct(opt)}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Live summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>ملخص التوفير</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>
                    {num(newSavings)} <Text style={styles.summaryUnit}>ر.س/شهر</Text>
                  </Text>
                  <Text style={styles.summaryLabel}>ادخارك الجديد</Text>
                </View>

                <View style={[styles.summaryRow, { marginTop: 10 }]}>
                  <Text style={[styles.summaryValue, { color: GREEN }]}>
                    +{num(savedPerMonth)} <Text style={styles.summaryUnit}>ر.س/شهر</Text>
                  </Text>
                  <Text style={styles.summaryLabel}>توفير إضافي</Text>
                </View>

                {monthsFaster > 0 && (
                  <View style={styles.fasterBox}>
                    <Ionicons name="flash" size={16} color={CORAL} />
                    <Text style={styles.fasterText}>
                      ستصلين لهدفك أسرع بـ {digits(monthsFaster)} {monthsFaster === 1 ? 'شهر' : monthsFaster === 2 ? 'شهرين' : 'أشهر'}!
                    </Text>
                  </View>
                )}

                {savedPerMonth === 0 && (
                  <View style={styles.neutralBox}>
                    <Ionicons name="information-circle-outline" size={15} color={MUTED} />
                    <Text style={styles.neutralText}>اختاري تقليصاً من القائمة أعلاه لتري التوفير</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* CTA button */}
            <View style={[styles.footer, { borderTopColor: BORDER }]}>
              <TouchableOpacity
                style={[styles.ctaBtn, savedPerMonth === 0 && styles.ctaBtnDim]}
                onPress={handleGenerate}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={18} color={WHITE} style={{ marginLeft: 8 }} />
                <Text style={styles.ctaBtnText}>احسب خطتي الجديدة</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: NAVY2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
  },
  successSheet: {
    maxHeight: '85%',
    minHeight: 520,
  },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 17 },
  headerSub:   { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  divider: { height: 1, backgroundColor: BORDER },
  scrollContent: { padding: 16, gap: 12 },

  /* Goal banner */
  goalBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(232,133,106,0.08)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(232,133,106,0.25)', marginBottom: 4,
  },
  goalRight: { alignItems: 'flex-end' },
  goalLabel:  { color: CORAL, fontFamily: 'Inter_500Medium', fontSize: 12 },
  goalName:   { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 2 },
  goalAmount: { color: CORAL, fontFamily: 'Inter_700Bold', fontSize: 18 },

  /* Expense card */
  expenseCard: { backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, gap: 12 },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expenseRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  expenseEmoji:  { fontSize: 24 },
  expenseLabel:  { color: WHITE, fontFamily: 'Inter_600SemiBold', fontSize: 14, textAlign: 'right' },
  expenseOriginal: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'right', marginTop: 1 },
  expenseLeft: { alignItems: 'flex-end', gap: 4 },
  expenseNew:  { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'left' },
  expenseSar:  { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 11 },
  savingTag: {
    backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)',
  },
  savingTagText: { color: '#4CAF50', fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  /* Segmented control */
  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1, paddingVertical: 7, borderRadius: 10,
    backgroundColor: SEGMENT_INACTIVE, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  segmentActive: { backgroundColor: CORAL, borderColor: CORAL },
  segmentText:       { color: MUTED, fontFamily: 'Inter_500Medium', fontSize: 10, textAlign: 'center' },
  segmentTextActive: { color: WHITE, fontFamily: 'Inter_700Bold' },

  /* Summary */
  summaryCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginTop: 4 },
  summaryTitle: { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'right', marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 13 },
  summaryValue: { color: CORAL, fontFamily: 'Inter_700Bold', fontSize: 20 },
  summaryUnit:  { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 12 },
  fasterBox: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(232,133,106,0.1)', borderRadius: 12, padding: 10, marginTop: 14,
    borderWidth: 1, borderColor: 'rgba(232,133,106,0.25)',
  },
  fasterText:  { color: CORAL, fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1, textAlign: 'right' },
  neutralBox:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 12, opacity: 0.6 },
  neutralText: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, textAlign: 'right' },

  /* Footer CTA */
  footer: { padding: 16, borderTopWidth: 1 },
  ctaBtn: {
    height: 54, borderRadius: 16, backgroundColor: CORAL,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: CORAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 20px rgba(232,133,106,0.4)' } as any,
    }),
  },
  ctaBtnDim:  { opacity: 0.75 },
  ctaBtnText: { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 16 },

  /* ── Success view ── */
  successContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(76,175,80,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  successTitle: {
    color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 22,
    textAlign: 'center', marginBottom: 8,
  },
  successSub: {
    color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 13,
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  successCard: {
    width: '100%', backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(232,133,106,0.4)',
    padding: 18, marginBottom: 24,
  },
  successBadge: {
    alignSelf: 'flex-end', backgroundColor: 'rgba(232,133,106,0.15)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(232,133,106,0.3)',
  },
  successBadgeText: { color: CORAL, fontFamily: 'Inter_700Bold', fontSize: 13 },
  successStatRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 11,
  },
  successStatLabel: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 14 },
  successStatVal:   { flexDirection: 'row', alignItems: 'baseline' },
  successStatAmount: { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 22 },
  successStatUnit:   { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 13 },
  successDivider:    { height: 1, backgroundColor: BORDER },
  successMotivation: {
    color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 13,
    textAlign: 'right', lineHeight: 20, paddingTop: 12,
  },
  confirmBtn: {
    width: '100%', height: 52, borderRadius: 16,
    backgroundColor: CORAL, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: CORAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(232,133,106,0.35)' } as any,
    }),
  },
  confirmBtnText: { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 16 },
});
