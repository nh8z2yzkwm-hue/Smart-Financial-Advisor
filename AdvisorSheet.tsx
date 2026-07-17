/**
 * AdvisorSheet — slides up from the bottom on the home screen.
 * Includes a built-in Arabic virtual keyboard so users without an Arabic
 * system keyboard can still type. Toggle between Arabic/EN with the ع button.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import PlanCard, { Plan } from '@/components/PlanCard';
import ChartBubble, { ChartPayload } from '@/components/ChartBubble';
import { MockUser, totalExpenses, monthlySavings } from '@/data/mockUsers';

// ── Types ──────────────────────────────────────────────────────────────────────

type WhatIfScenario = {
  category: string;
  emoji: string;
  reduction: number;      // fraction e.g. 0.25
  savedPerMonth: number;  // extra riyals freed
  newMonths: number;      // months to goal with extra saving
  monthsSaved: number;    // months saved vs original plan
};

type ChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'plans'; plans: Plan[] }
  | { id: string; kind: 'whatif-prompt'; plan: Plan }
  | { id: string; kind: 'whatif-results'; plan: Plan; scenarios: WhatIfScenario[] }
  | { id: string; kind: 'chart'; payload: ChartPayload };

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ── What-If calculation ────────────────────────────────────────────────────────

function buildExpenseItems(user?: MockUser | null) {
  const e = user?.expenses;
  return [
    { category: 'المطاعم',         emoji: '🍽️', amount: e?.restaurants ?? 800,  reduction: 0.25 },
    { category: 'التسوق',          emoji: '🛍️', amount: e?.shopping    ?? 1200, reduction: 0.30 },
    { category: 'القهوة والمقاهي', emoji: '☕',  amount: e?.coffee      ?? 300,  reduction: 0.40 },
    { category: 'المواصلات',       emoji: '🚗',  amount: e?.transport   ?? 500,  reduction: 0.20 },
    { category: 'الفواتير',        emoji: '📱',  amount: e?.bills       ?? 400,  reduction: 0.15 },
  ];
}

function computeWhatIf(plan: Plan, user?: MockUser | null): WhatIfScenario[] {
  const target = plan.monthlySaving * plan.months;
  return buildExpenseItems(user)
    .map(exp => {
      const savedPerMonth = Math.round(exp.amount * exp.reduction);
      const newMonthly   = plan.monthlySaving + savedPerMonth;
      const newMonths    = Math.ceil(target / newMonthly);
      const monthsSaved  = plan.months - newMonths;
      return { ...exp, savedPerMonth, newMonths, monthsSaved };
    })
    .filter(s => s.monthsSaved > 0)
    .sort((a, b) => b.monthsSaved - a.monthsSaved);
}

// ── Bubble components ──────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <View style={bubbleStyles.userWrapper}>
      <View style={bubbleStyles.userBubble}>
        <Text style={bubbleStyles.userText}>{text}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <View style={bubbleStyles.assistantWrapper}>
      <View style={bubbleStyles.assistantAvatar}>
        <MaterialCommunityIcons name="creation" size={16} color="#FF6B6B" />
      </View>
      <View style={bubbleStyles.assistantBubble}>
        <Text style={bubbleStyles.assistantText}>{text}</Text>
      </View>
    </View>
  );
}

function TypingBubble() {
  return (
    <View style={bubbleStyles.assistantWrapper}>
      <View style={bubbleStyles.assistantAvatar}>
        <MaterialCommunityIcons name="creation" size={16} color="#FF6B6B" />
      </View>
      <View style={[bubbleStyles.assistantBubble, { paddingHorizontal: 20 }]}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    </View>
  );
}

// ── What-If Prompt Bubble ─────────────────────────────────────────────────────

function WhatIfPromptBubble({
  plan,
  onAccept,
  onIgnore,
}: {
  plan: Plan;
  onAccept: () => void;
  onIgnore: () => void;
}) {
  return (
    <View style={wiStyles.wrapper}>
      <View style={wiStyles.card}>
        {/* Icon + title row */}
        <View style={wiStyles.titleRow}>
          <Text style={wiStyles.titleIcon}>💡</Text>
          <Text style={wiStyles.title}>شرايك تجرّب ميزة «ماذا لو»؟</Text>
        </View>
        <Text style={wiStyles.body}>
          أريك كيف يمكن تخفيف بعض مصاريفك الشهرية يقرّب هدف
          {' «'}{plan.name}{'»'} أسرع — بدون تأثير كبير على حياتك.
        </Text>
        <View style={wiStyles.btnRow}>
          <TouchableOpacity style={wiStyles.btnIgnore} onPress={onIgnore} activeOpacity={0.7}>
            <Text style={wiStyles.btnIgnoreText}>تجاهل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={wiStyles.btnAccept} onPress={onAccept} activeOpacity={0.8}>
            <Text style={wiStyles.btnAcceptText}>نعم، أرني! ✨</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── What-If Results Bubble ────────────────────────────────────────────────────

function WhatIfResultsBubble({
  plan,
  scenarios,
  onIgnore,
  onOpenPlanner,
}: {
  plan: Plan;
  scenarios: WhatIfScenario[];
  onIgnore: () => void;
  onOpenPlanner: () => void;
}) {
  return (
    <View style={wiStyles.wrapper}>
      <View style={wiStyles.card}>
        <Text style={wiStyles.resultsTitle}>📊 ماذا لو خففت مصاريفك؟</Text>
        <Text style={wiStyles.resultsSubtitle}>
          مقارنةً بخطة «{plan.name}» الحالية ({plan.months} شهر)
        </Text>

        {scenarios.map((s, i) => (
          <View key={i} style={[wiStyles.scenarioRow, i < scenarios.length - 1 && wiStyles.scenarioBorder]}>
            {/* Left: months saved badge */}
            <View style={wiStyles.savedBadge}>
              <Text style={wiStyles.savedLabel}>
                {s.monthsSaved === 1
                  ? 'أسرع\nبشهر!'
                  : s.monthsSaved === 2
                  ? 'أسرع\nبشهرين!'
                  : s.monthsSaved <= 10
                  ? `أسرع بـ\n${s.monthsSaved} أشهر!`
                  : `أسرع بـ\n${s.monthsSaved} شهراً!`}
              </Text>
            </View>
            {/* Right: description */}
            <View style={wiStyles.scenarioText}>
              <Text style={wiStyles.scenarioTitle}>
                {s.emoji} ماذا لو خففت {s.category} {Math.round(s.reduction * 100)}%؟
              </Text>
              <Text style={wiStyles.scenarioDetail}>
                توفر <Text style={wiStyles.highlight}>{s.savedPerMonth} ريال</Text> إضافي/شهر → تصل خلال {s.newMonths} شهر
              </Text>
            </View>
          </View>
        ))}

        {/* Two-choice footer */}
        <View style={wiStyles.choiceRow}>
          <TouchableOpacity style={wiStyles.choiceIgnore} onPress={onIgnore} activeOpacity={0.75}>
            <Text style={wiStyles.choiceIgnoreText}>تجاهل</Text>
            <Text style={wiStyles.choiceIgnoreSub}>أبقى على خطتي الحالية</Text>
          </TouchableOpacity>
          <TouchableOpacity style={wiStyles.choicePlanner} onPress={onOpenPlanner} activeOpacity={0.85}>
            <MaterialCommunityIcons name="calculator-variant-outline" size={18} color="#fff" style={{ marginBottom: 2 }} />
            <Text style={wiStyles.choicePlannerText}>خطط مصاريفك</Text>
            <Text style={wiStyles.choicePlannerSub}>عدّل وطبّق التوفير</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const wiStyles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  card: {
    backgroundColor: '#0F1E2E',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  // ── Prompt ──
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
  titleIcon: { fontSize: 20 },
  title: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'right', flex: 1 },
  body: { color: '#8FA3B8', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'right', lineHeight: 20, marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnIgnore: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#2A3F56',
    alignItems: 'center', justifyContent: 'center',
  },
  btnIgnoreText: { color: '#6B8499', fontFamily: 'Inter_500Medium', fontSize: 14 },
  btnAccept: {
    flex: 2, height: 40, borderRadius: 10, backgroundColor: '#FF6B6B',
    alignItems: 'center', justifyContent: 'center',
  },
  btnAcceptText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  // ── Results ──
  resultsTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'right', marginBottom: 4 },
  resultsSubtitle: { color: '#8FA3B8', fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'right', marginBottom: 14 },
  scenarioRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 10,
  },
  scenarioBorder: { borderBottomWidth: 1, borderBottomColor: '#1A2F45' },
  savedBadge: {
    width: 56, minHeight: 56, borderRadius: 12, backgroundColor: '#1A2F45',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    paddingVertical: 6,
  },
  savedNum: { color: '#4CAF50', fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 22 },
  savedLabel: { color: '#4CAF50', fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center', lineHeight: 13 },
  scenarioText: { flex: 1 },
  scenarioTitle: { color: '#FFFFFF', fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'right', marginBottom: 3 },
  scenarioDetail: { color: '#8FA3B8', fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'right' },
  highlight: { color: '#FF6B6B', fontFamily: 'Inter_700Bold' },
  // ── Two-choice footer ──
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  choiceIgnore: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3F56',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#0B1521',
  },
  choiceIgnoreText: { color: '#8FA3B8', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  choiceIgnoreSub:  { color: '#4A6070', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  choicePlanner: {
    flex: 1.8,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    ...Platform.select({
      ios: { shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 5 },
      web: { boxShadow: '0 3px 12px rgba(255,107,107,0.35)' } as any,
    }),
  },
  choicePlannerText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  choicePlannerSub:  { color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
});

const bubbleStyles = StyleSheet.create({
  userWrapper: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: '#C5778E',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
  },
  assistantWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1A2A3D',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assistantBubble: {
    flex: 1,
    maxWidth: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  assistantText: {
    color: '#1A2A3D',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 24,
  },
});

// ── Arabic virtual keyboard ────────────────────────────────────────────────────

const AR_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
  ['؟', '،', '.'],
];

const EN_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ['?', ',', '.', '!'],
];

const QUICK_PROMPTS = [
  'أريد ادخار 30,000 ريال لقسط سيارة',
  'كيف أوفر للحج؟',
  'ساعدني في تقليص مصاريفي',
  'ما هو أفضل خطة توفير؟',
];

const SW = Dimensions.get('window').width;
const KB_PAD = 8;
const KEY_GAP = 4;

function keyWidth(count: number) {
  return (SW - KB_PAD * 2 - KEY_GAP * (count - 1)) / count;
}

interface ArabicKbProps {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  bottomPad: number;
}

function ArabicKeyboard({ value, onChangeText, onSend, bottomPad }: ArabicKbProps) {
  const [lang, setLang] = React.useState<'ar' | 'en'>('ar');
  const append = (ch: string) => onChangeText(value + ch);
  const del = () => onChangeText(value.slice(0, -1));
  const canSend = value.trim().length > 0;
  const rows = lang === 'ar' ? AR_ROWS : EN_ROWS;
  const isAr = lang === 'ar';

  return (
    <View style={[kb.container, { paddingBottom: bottomPad + 6 }]}>
      {/* Quick prompts — only in Arabic mode */}
      {isAr && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={kb.quickRow}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_PROMPTS.map(q => (
            <TouchableOpacity key={q} style={kb.chip} onPress={() => onChangeText(q)} activeOpacity={0.7}>
              <Text style={kb.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Letter rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={kb.row}>
          {row.map(char => (
            <TouchableOpacity
              key={char}
              style={[kb.key, { width: keyWidth(row.length) }]}
              onPress={() => append(char)}
              activeOpacity={0.65}
            >
              <Text style={kb.keyText}>{char}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Control row */}
      <View style={kb.row}>
        {/* Lang toggle */}
        <TouchableOpacity
          style={[kb.key, { width: 52, backgroundColor: '#1A2A3D', borderColor: '#FF6B6B' }]}
          onPress={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          activeOpacity={0.75}
        >
          <Text style={[kb.keyText, { fontSize: 13, color: '#FF6B6B' }]}>{isAr ? 'EN' : 'ع'}</Text>
        </TouchableOpacity>

        {/* Space */}
        <TouchableOpacity style={[kb.key, { flex: 1 }]} onPress={() => append(' ')} activeOpacity={0.65}>
          <Text style={kb.keyText}>{isAr ? 'مسافة' : 'space'}</Text>
        </TouchableOpacity>

        {/* Backspace */}
        <TouchableOpacity style={[kb.key, { width: 52 }]} onPress={del} activeOpacity={0.65}>
          <Text style={[kb.keyText, { fontSize: 18 }]}>⌫</Text>
        </TouchableOpacity>

        {/* Send */}
        <TouchableOpacity
          style={[kb.key, { width: 74, backgroundColor: canSend ? '#FF6B6B' : '#1E2F40', borderColor: canSend ? '#FF6B6B' : '#243347' }]}
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Text style={[kb.keyText, { color: canSend ? '#fff' : '#5A7A99', fontSize: 13 }]}>
            {isAr ? 'إرسال ↑' : 'send ↑'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const kb = StyleSheet.create({
  container: {
    backgroundColor: '#0B1521',
    borderTopWidth: 1,
    borderTopColor: '#1E2F40',
    paddingTop: 8,
    paddingHorizontal: KB_PAD,
    gap: KEY_GAP,
  },
  quickRow: {
    gap: 8,
    paddingBottom: 6,
    paddingHorizontal: 2,
  },
  chip: {
    backgroundColor: '#152236',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#243347',
  },
  chipText: {
    color: '#8FA3B8',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    gap: KEY_GAP,
    justifyContent: 'center',
  },
  key: {
    height: 42,
    backgroundColor: '#152236',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#243347',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    writingDirection: 'rtl',
  },
});

// ── Main AdvisorSheet ──────────────────────────────────────────────────────────

interface AdvisorSheetProps {
  visible: boolean;
  onClose: () => void;
  user?: MockUser | null;
  /** Pre-built message to auto-send when the sheet opens (from WhatIfPlanner) */
  autoMessage?: string;
  /** Called when user taps "خطط مصاريفك" inside what-if results */
  onOpenPlanner?: () => void;
}

function buildWelcome(user?: MockUser | null): ChatMessage {
  const name = user?.name ?? 'عزيزتي';
  return {
    id: 'welcome',
    kind: 'assistant',
    text: `أهلاً بك ${name}! 👋 أنا مستشارك المالي الذكي، كيف يمكنني مساعدتك؟`,
  };
}

export default function AdvisorSheet({ visible, onClose, user, autoMessage, onOpenPlanner }: AdvisorSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([buildWelcome(user)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  /** true = show built-in Arabic keyboard, false = use system keyboard */
  const [showArabicKb, setShowArabicKb] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const autoSentRef = useRef<string | null>(null);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomPad = insets.bottom;

  // Auto-focus the input when the advisor opens (when using system keyboard)
  useEffect(() => {
    if (visible && !showArabicKb) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [visible, showArabicKb]);

  // Web-only: set dir="rtl" and lang="ar" on the DOM node so the browser
  // correctly handles Arabic physical-keyboard input (composition events, cursor direction)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => {
      const ref = inputRef.current as any;
      if (!ref) return;
      // React Native Web exposes the DOM node via ._node or directly
      const node: HTMLElement | null = ref._node ?? ref._inputElement ?? null;
      if (node && node.setAttribute) {
        node.setAttribute('dir', 'rtl');
        node.setAttribute('lang', 'ar');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const toggleKb = useCallback(() => {
    setShowArabicKb(prev => {
      const next = !prev;
      if (!next) {
        // switching TO system keyboard — focus input
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        Keyboard.dismiss();
      }
      return next;
    });
  }, []);

  // Auto-send the planner message when the sheet opens with an autoMessage
  useEffect(() => {
    if (visible && autoMessage && autoMessage !== autoSentRef.current && !loading) {
      autoSentRef.current = autoMessage;
      const timer = setTimeout(() => {
        sendDirect(autoMessage);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visible, autoMessage]);

  const sendDirect = useCallback(async (text: string) => {
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: ChatMessage = { id: genId(), kind: 'user', text };
    setMessages(prev => [userMsg, ...prev]);
    setLoading(true);
    try {
      const response = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/advisor/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            user: user ? {
              name: user.name, job: user.job, salary: user.salary,
              savingTarget: user.savingTarget, targetAmount: user.targetAmount,
              expenses: user.expenses,
              monthlySavings: monthlySavings(user),
              totalExpenses: totalExpenses(user),
            } : undefined,
          }),
        },
      );
      const data = await response.json();
      if (data.type === 'plans') {
        const introMsg: ChatMessage = { id: genId(), kind: 'assistant', text: data.intro };
        const plansMsg: ChatMessage = { id: genId(), kind: 'plans', plans: data.plans };
        setMessages(prev => [plansMsg, introMsg, ...prev]);
      } else if (data.type === 'chart') {
        const payload: ChartPayload = {
          chartType: data.chartType ?? 'donut', title: data.title ?? '',
          text: data.text ?? '', unit: data.unit, data: data.data ?? [], insight: data.insight,
        };
        setMessages(prev => [{ id: genId(), kind: 'chart', payload }, ...prev]);
      } else {
        setMessages(prev => [{ id: genId(), kind: 'assistant', text: data.text ?? 'عذراً، حاول مرة أخرى.' }, ...prev]);
      }
    } catch {
      setMessages(prev => [{ id: genId(), kind: 'assistant', text: 'تعذّر الاتصال، يرجى المحاولة مرة أخرى.' }, ...prev]);
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { id: genId(), kind: 'user', text };
    setMessages(prev => [userMsg, ...prev]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/advisor/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            user: user ? {
              name: user.name,
              job: user.job,
              salary: user.salary,
              savingTarget: user.savingTarget,
              targetAmount: user.targetAmount,
              expenses: user.expenses,
              monthlySavings: monthlySavings(user),
              totalExpenses: totalExpenses(user),
            } : undefined,
          }),
        },
      );

      const data = await response.json();

      if (data.type === 'plans') {
        const introMsg: ChatMessage = { id: genId(), kind: 'assistant', text: data.intro };
        const plansMsg: ChatMessage = { id: genId(), kind: 'plans', plans: data.plans };
        setMessages(prev => [plansMsg, introMsg, ...prev]);
      } else if (data.type === 'chart') {
        const payload: ChartPayload = {
          chartType: data.chartType ?? 'donut',
          title: data.title ?? '',
          text: data.text ?? '',
          unit: data.unit,
          data: data.data ?? [],
          insight: data.insight,
        };
        setMessages(prev => [{ id: genId(), kind: 'chart', payload }, ...prev]);
      } else {
        setMessages(prev => [
          { id: genId(), kind: 'assistant', text: data.text ?? 'عذراً، حاول مرة أخرى.' },
          ...prev,
        ]);
      }
    } catch {
      setMessages(prev => [
        { id: genId(), kind: 'assistant', text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.' },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const navigateToSuccess = useCallback((plan: Plan) => {
    handleClose();
    setTimeout(() => {
      router.push({
        pathname: '/success',
        params: {
          planName: plan.name,
          planType: plan.type,
          months: plan.months.toString(),
          monthlySaving: plan.monthlySaving.toString(),
          description: plan.description,
        },
      });
    }, 350);
  }, [handleClose]);

  const handlePlanSelect = useCallback((plan: Plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages(prev => [
      { id: genId(), kind: 'whatif-prompt', plan },
      ...prev,
    ]);
  }, []);

  const handleWhatIfAccept = useCallback((plan: Plan) => {
    const scenarios = computeWhatIf(plan, user);
    setMessages(prev => [
      { id: genId(), kind: 'whatif-results', plan, scenarios },
      ...prev,
    ]);
  }, []);

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.kind === 'user') return <UserBubble text={item.text} />;
    if (item.kind === 'assistant') return <AssistantBubble text={item.text} />;
    if (item.kind === 'plans') {
      return (
        <View>
          {item.plans.map(plan => (
            <PlanCard
              key={plan.type}
              plan={plan}
              onSelect={() => handlePlanSelect(plan)}
            />
          ))}
        </View>
      );
    }
    if (item.kind === 'whatif-prompt') {
      return (
        <WhatIfPromptBubble
          plan={item.plan}
          onAccept={() => handleWhatIfAccept(item.plan)}
          onIgnore={() => navigateToSuccess(item.plan)}
        />
      );
    }
    if (item.kind === 'whatif-results') {
      return (
        <WhatIfResultsBubble
          plan={item.plan}
          scenarios={item.scenarios}
          onIgnore={() => navigateToSuccess(item.plan)}
          onOpenPlanner={() => {
            handleClose();
            setTimeout(() => onOpenPlanner?.(), 350);
          }}
        />
      );
    }
    if (item.kind === 'chart') {
      return <ChartBubble payload={item.payload} />;
    }
    return null;
  }, [handlePlanSelect, handleWhatIfAccept, navigateToSuccess]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <View style={[sheet.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            sheet.header,
            {
              paddingTop: Platform.OS === 'ios' ? 16 : topPad + 8,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={sheet.headerRight}>
            <View style={sheet.headerTextBlock}>
              <Text style={[sheet.headerTitle, { color: colors.foreground }]}>
                المستشار المالي الذكي
              </Text>
              <View style={sheet.statusRow}>
                <View style={[sheet.onlineDot, { backgroundColor: colors.success }]} />
                <Text style={[sheet.statusText, { color: colors.success }]}>نشط الآن</Text>
              </View>
            </View>
            <View style={[sheet.headerIcon, { backgroundColor: colors.secondary }]}>
              <MaterialCommunityIcons name="creation" size={22} color={colors.primary} />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            style={sheet.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Messages + input */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={showArabicKb ? 'height' : (Platform.OS === 'ios' ? 'padding' : 'height')}
        >
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            inverted
            style={{ flex: 1 }}
            contentContainerStyle={sheet.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={loading ? <TypingBubble /> : null}
          />

          {/* Input bar */}
          <View
            style={[
              sheet.inputBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: showArabicKb ? 10 : (Platform.OS === 'ios' ? bottomPad + 8 : bottomPad + 12),
              },
            ]}
          >
            {/* Send */}
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={[
                sheet.sendBtn,
                { backgroundColor: input.trim() && !loading ? colors.primary : colors.muted },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Text input */}
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={showArabicKb ? 'اكتب بالكيبورد الظاهر…' : 'اكتب بالعربي بكيبورد جهازك…'}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlign="right"
              returnKeyType="send"
              blurOnSubmit={false}
              showSoftInputOnFocus={!showArabicKb}
              autoFocus={visible && !showArabicKb}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                sheet.input,
                {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderColor: colors.border,
                  writingDirection: 'rtl',
                },
              ]}
            />

            {/* Keyboard toggle: system keyboard (laptop) is default; on-screen is fallback */}
            <TouchableOpacity
              style={[
                sheet.kbToggle,
                { borderColor: showArabicKb ? '#FF6B6B' : colors.border },
              ]}
              onPress={toggleKb}
              activeOpacity={0.75}
              accessibilityLabel={showArabicKb ? 'استخدام كيبورد الجهاز' : 'فتح كيبورد عربي على الشاشة'}
            >
              <MaterialCommunityIcons
                name={showArabicKb ? 'keyboard-off' : 'keyboard'}
                size={20}
                color={showArabicKb ? '#FF6B6B' : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Hint */}
          {!showArabicKb && (
            <Text style={[sheet.kbHint, { color: colors.mutedForeground }]}>
              اكتب بالعربي مباشرة بكيبورد جهازك. اضغط الزر بجانب الحقل للكيبورد الاحتياطي.
            </Text>
          )}
        </KeyboardAvoidingView>

        {/* Arabic virtual keyboard (only when explicitly requested) */}
        {showArabicKb && (
          <ArabicKeyboard
            value={input}
            onChangeText={setInput}
            onSend={sendMessage}
            bottomPad={bottomPad}
          />
        )}
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kbToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kbHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
