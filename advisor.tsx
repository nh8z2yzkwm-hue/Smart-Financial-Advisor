import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import PlanCard, { Plan } from '@/components/PlanCard';

type ChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'plans'; plans: Plan[] };

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    kind: 'assistant',
    text: 'أهلاً بك فرح! أنا مستشارك المالي الذكي، كيف يمكنني مساعدتك؟',
  },
];

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function UserBubble({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.userBubbleWrapper}>
      <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
        <Text style={styles.userBubbleText}>{text}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.assistantBubbleWrapper}>
      <View style={[styles.assistantAvatar, { backgroundColor: colors.secondary }]}>
        <MaterialCommunityIcons name="brain" size={16} color={colors.primary} />
      </View>
      <View style={[styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.assistantBubbleText, { color: colors.foreground }]}>{text}</Text>
      </View>
    </View>
  );
}

function TypingIndicator({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.assistantBubbleWrapper}>
      <View style={[styles.assistantAvatar, { backgroundColor: colors.secondary }]}>
        <MaterialCommunityIcons name="brain" size={16} color={colors.primary} />
      </View>
      <View style={[styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    </View>
  );
}

export default function AdvisorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

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
          body: JSON.stringify({ message: text }),
        },
      );

      const data = await response.json();

      if (data.type === 'plans') {
        const introMsg: ChatMessage = {
          id: genId(),
          kind: 'assistant',
          text: data.intro,
        };
        const plansMsg: ChatMessage = {
          id: genId(),
          kind: 'plans',
          plans: data.plans,
        };
        setMessages(prev => [plansMsg, introMsg, ...prev]);
      } else {
        const assistantMsg: ChatMessage = {
          id: genId(),
          kind: 'assistant',
          text: data.text ?? 'عذراً، لم أفهم طلبك. هل يمكنك إعادة الصياغة؟',
        };
        setMessages(prev => [assistantMsg, ...prev]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: genId(),
        kind: 'assistant',
        text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
      };
      setMessages(prev => [errorMsg, ...prev]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.kind === 'user') {
        return <UserBubble text={item.text} colors={colors} />;
      }
      if (item.kind === 'assistant') {
        return <AssistantBubble text={item.text} colors={colors} />;
      }
      if (item.kind === 'plans') {
        return (
          <View style={styles.plansWrapper}>
            {item.plans.map(plan => (
              <PlanCard
                key={plan.type}
                plan={plan}
                onSelect={() =>
                  router.push({
                    pathname: '/success',
                    params: {
                      planName: plan.name,
                      planType: plan.type,
                      months: plan.months.toString(),
                      monthlySaving: plan.monthlySaving.toString(),
                      description: plan.description,
                    },
                  })
                }
              />
            ))}
          </View>
        );
      }
      return null;
    },
    [colors],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRight}>
          <View style={[styles.onlineDot, { backgroundColor: '#4CAF50' }]} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              المستشار المالي الذكي
            </Text>
            <Text style={[styles.headerStatus, { color: colors.success }]}>نشط الآن</Text>
          </View>
          <View style={[styles.headerAvatar, { backgroundColor: colors.secondary }]}>
            <MaterialCommunityIcons name="brain" size={20} color={colors.primary} />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
            size={24}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={loading ? <TypingIndicator colors={colors} /> : null}
        />

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0),
            },
          ]}
        >
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !loading ? colors.primary : colors.muted,
              },
            ]}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="اكتب رسالتك هنا..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlign="right"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    textAlign: 'right',
  },
  headerStatus: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'right',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  // User bubble
  userBubbleWrapper: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubbleText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
  },

  // Assistant bubble
  assistantBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assistantBubble: {
    flex: 1,
    maxWidth: '85%',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantBubbleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 24,
  },

  // Plans
  plansWrapper: {
    marginVertical: 4,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
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
});
