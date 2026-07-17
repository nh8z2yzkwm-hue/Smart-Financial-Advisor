import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { MockUser, totalExpenses } from '@/data/mockUsers';
import { useFmt } from '@/hooks/useFmt';

interface ExpenseChartProps {
  user?: MockUser | null;
}

const DEFAULT_EXPENSES = [
  { label: 'الإيجار',    amount: 3000, color: '#FF6B6B', gradient: ['#FF6B6B', '#C94B4B'] as const },
  { label: 'التسوق',     amount: 1200, color: '#FFC107', gradient: ['#FFC107', '#D49A00'] as const },
  { label: 'المطاعم',    amount: 800,  color: '#4CAF50', gradient: ['#4CAF50', '#2E7D32'] as const },
  { label: 'المواصلات',  amount: 500,  color: '#00E5FF', gradient: ['#00E5FF', '#0099CC'] as const },
  { label: 'الفواتير',   amount: 400,  color: '#8FA3B8', gradient: ['#8FA3B8', '#5A708A'] as const },
];

function buildExpenses(user: MockUser) {
  const e = user.expenses;
  return [
    { label: 'الإيجار',    amount: e.rent,        color: '#FF6B6B', gradient: ['#FF6B6B', '#C94B4B'] as const },
    { label: 'التسوق',     amount: e.shopping,    color: '#FFC107', gradient: ['#FFC107', '#D49A00'] as const },
    { label: 'المطاعم',    amount: e.restaurants, color: '#4CAF50', gradient: ['#4CAF50', '#2E7D32'] as const },
    { label: 'المواصلات',  amount: e.transport,   color: '#00E5FF', gradient: ['#00E5FF', '#0099CC'] as const },
    { label: 'الفواتير',   amount: e.bills,       color: '#8FA3B8', gradient: ['#8FA3B8', '#5A708A'] as const },
  ];
}

export function ExpenseChart({ user }: ExpenseChartProps) {
  const colors = useColors();
  const { num, digits, pct: fmtPct } = useFmt();
  const EXPENSES = user ? buildExpenses(user) : DEFAULT_EXPENSES;
  const TOTAL    = user ? totalExpenses(user) : DEFAULT_EXPENSES.reduce((s, e) => s + e.amount, 0);
  const avail    = user ? user.salary - TOTAL : 5100;
  const topItem  = [...EXPENSES].sort((a, b) => b.amount - a.amount)[0];
  const saving   = Math.round(topItem.amount * 0.5);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.totalBox}>
          <Text style={styles.totalValue}>{num(TOTAL)}</Text>
          <Text style={styles.totalLabel}>ريال / شهر</Text>
        </View>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>تحليل المصاريف</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>أكبر 5 فئات مصاريف</Text>
        </View>
      </View>

      <View style={styles.bars}>
        {EXPENSES.map(item => {
          const pct = (item.amount / TOTAL) * 100;
          return (
            <View key={item.label} style={styles.barRow}>
              <View style={styles.barRight}>
                <Text style={[styles.barPct, { color: item.color }]}>{fmtPct(Math.round(pct))}</Text>
                <Text style={[styles.barAmount, { color: colors.foreground }]}>
                  {num(item.amount)}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={item.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${pct}%` }]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.insight}>
        <Text style={styles.insightIcon}>💡</Text>
        <Text style={[styles.insightText, { color: colors.mutedForeground }]}>
          {topItem.label} يمثل {fmtPct(Math.round((topItem.amount / TOTAL) * 100))} من مصاريفك الشهرية. تقليصه {fmtPct(50)} يوفر {num(saving)} ريال/شهر.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'right' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'right', marginTop: 2 },
  totalBox: { alignItems: 'flex-end' },
  totalValue: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#FF6B6B' },
  totalLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#8FA3B8' },
  bars: { gap: 12 },
  barRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  barLabel: { width: 70, fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'right' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#1E2F40', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barRight: { width: 72, alignItems: 'flex-end' },
  barAmount: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  barPct: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  insight: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, marginTop: 16,
    backgroundColor: '#132135', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#243347',
  },
  insightIcon: { fontSize: 14 },
  insightText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'right', lineHeight: 18 },
});

export default ExpenseChart;
