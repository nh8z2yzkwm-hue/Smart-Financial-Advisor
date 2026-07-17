import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/context/UserContext';

const NAVY   = '#0D1B2A';
const CORAL  = '#E8856A';
const WHITE  = '#FFFFFF';
const MUTED  = '#5A7A96';
const FIELD  = '#132335';
const BORDER = '#1B3048';
const ERROR_BG  = 'rgba(232,133,106,0.10)';
const ERROR_BDR = 'rgba(232,133,106,0.30)';

// ── All UI strings in both languages ─────────────────────────────────────────
const T = {
  ar: {
    title:       'مرحباً بك في الإنماء',
    userPlaceholder: 'اسم المستخدم أو رقم الهوية',
    passPlaceholder: 'كلمة المرور',
    remember:    'تذكرني',
    loginBtn:    'تسجيل الدخول',
    forgot:      'نسيت اسم المستخدم أو كلمة المرور ؟',
    register:    'فتح حساب أو التسجيل',
    contact:     'اتصل بنا',
    emergency:   'الإيقاف الطارئ',
    copyright:   'جميع الحقوق محفوظة. الإنماء 2026',
    errEmpty:    'الرجاء إدخال اسم المستخدم وكلمة المرور',
    errWrongUser:'اسم المستخدم غير مسجل في النظام',
    errWrongPass:'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى',
    errGeneric:  'اسم المستخدم أو كلمة المرور غير صحيحة',
    langLabel:   'En',
    dir:         'rtl' as 'rtl' | 'ltr',
    align:       'right' as 'right' | 'left',
  },
  en: {
    title:       'Welcome to Inma',
    userPlaceholder: 'Username or National ID',
    passPlaceholder: 'Password',
    remember:    'Remember me',
    loginBtn:    'Sign In',
    forgot:      'Forgot username or password?',
    register:    'Open an account or register',
    contact:     'Contact Us',
    emergency:   'Emergency Stop',
    copyright:   'All rights reserved. Inma 2026',
    errEmpty:    'Please enter your username and password',
    errWrongUser:'This username is not registered in the system',
    errWrongPass:'Incorrect password, please try again',
    errGeneric:  'Incorrect username or password',
    langLabel:   'عر',
    dir:         'ltr' as 'rtl' | 'ltr',
    align:       'left' as 'right' | 'left',
  },
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, lang, setLang } = useUser();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [fieldErr, setFieldErr] = useState<'user' | 'pass' | 'both' | null>(null);

  const t = T[lang];
  const isRTL = lang === 'ar';
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const toggleLang = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLang(lang === 'ar' ? 'en' : 'ar');
    setError('');
    setFieldErr(null);
  };

  const handleLogin = async () => {
    setError('');
    setFieldErr(null);

    // Empty check
    if (!username.trim() && !password.trim()) {
      setError(t.errEmpty);
      setFieldErr('both');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!username.trim()) {
      setError(t.errWrongUser);
      setFieldErr('user');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!password.trim()) {
      setError(t.errWrongPass);
      setFieldErr('pass');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const result = login(username, password);
    setLoading(false);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Distinguish wrong user vs wrong pass
      const { findUser } = require('@/data/mockUsers');
      const userExists = require('@/data/mockUsers').MOCK_USERS.find(
        (u: any) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (!userExists) {
        setError(t.errWrongUser);
        setFieldErr('user');
      } else {
        setError(t.errWrongPass);
        setFieldErr('pass');
      }
    }
  };

  // Flip row direction for top bar based on language
  const rowDir = isRTL ? 'row' : 'row-reverse';
  const iconRowDir = isRTL ? 'row' : 'row-reverse';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: NAVY }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={[styles.topBar, { flexDirection: rowDir }]}>
          {/* Icons group */}
          <View style={[styles.topLeft, { flexDirection: iconRowDir }]}>
            {/* Language toggle */}
            <TouchableOpacity style={styles.globeBtn} onPress={toggleLang} activeOpacity={0.7}>
              <Ionicons name="globe-outline" size={13} color={MUTED} />
              <Text style={styles.globeText}>{t.langLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={16} color={CORAL} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="grid" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Alinma logo */}
          <View style={styles.logoBox}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── Title ── */}
        <Text style={[styles.title, { textAlign: t.align }]}>{t.title}</Text>

        {/* ── Username field ── */}
        <View style={[
          styles.field,
          { flexDirection: isRTL ? 'row' : 'row-reverse' },
          (fieldErr === 'user' || fieldErr === 'both') && styles.fieldError,
        ]}>
          <TextInput
            style={[styles.fieldInput, { textAlign: t.align }]}
            placeholder={t.userPlaceholder}
            placeholderTextColor={MUTED}
            value={username}
            onChangeText={v => { setUsername(v); setError(''); setFieldErr(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <Ionicons name="person-outline" size={18} color={
            fieldErr === 'user' || fieldErr === 'both' ? CORAL : MUTED
          } style={styles.fieldIcon} />
        </View>

        {/* ── Password field ── */}
        <View style={[
          styles.field,
          { flexDirection: isRTL ? 'row' : 'row-reverse' },
          (fieldErr === 'pass' || fieldErr === 'both') && styles.fieldError,
        ]}>
          <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={MUTED} />
          </TouchableOpacity>
          <TextInput
            style={[styles.fieldInput, { textAlign: t.align }]}
            placeholder={t.passPlaceholder}
            placeholderTextColor={MUTED}
            value={password}
            onChangeText={v => { setPassword(v); setError(''); setFieldErr(null); }}
            secureTextEntry={!showPass}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <Ionicons name="lock-closed-outline" size={18} color={
            fieldErr === 'pass' || fieldErr === 'both' ? CORAL : MUTED
          } style={styles.fieldIcon} />
        </View>

        {/* ── Remember me ── */}
        <TouchableOpacity
          style={[styles.rememberRow, { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}
          onPress={() => setRemember(v => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, remember && styles.checkboxOn]}>
            {remember && <Ionicons name="checkmark" size={11} color={WHITE} />}
          </View>
          <Text style={styles.rememberText}>{t.remember}</Text>
        </TouchableOpacity>

        {/* ── Error banner ── */}
        {!!error && (
          <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="alert-circle" size={17} color={CORAL} />
            <Text style={[styles.errorText, { textAlign: t.align }]}>{error}</Text>
          </View>
        )}

        {/* ── Login button ── */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.75 }]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={WHITE} size="small" />
            : <Text style={styles.loginBtnText}>{t.loginBtn}</Text>
          }
        </TouchableOpacity>

        {/* ── Links ── */}
        <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
          <Text style={styles.linkText}>{t.forgot}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
          <Text style={styles.linkText}>{t.register}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, minHeight: 40 }} />

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t.emergency}</Text>
          </TouchableOpacity>
          <Text style={styles.footerSep}>|</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t.contact}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.copyright}>{t.copyright}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    backgroundColor: NAVY,
  },

  /* Top bar */
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  topLeft: { alignItems: 'center', gap: 8 },
  globeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#132335',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  globeText: { color: MUTED, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  topIconBtn: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#132335',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  logoBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#132335',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
  },
  logoImg: { width: 32, height: 32 },

  /* Title */
  title: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: WHITE,
    marginBottom: 24,
    lineHeight: 42,
  },

  /* Input fields */
  field: {
    alignItems: 'center',
    backgroundColor: FIELD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 4,
    marginBottom: 12,
  },
  fieldError: {
    borderColor: CORAL,
    backgroundColor: ERROR_BG,
  },
  fieldIcon: { marginHorizontal: 2 },
  eyeBtn: { padding: 4 },
  fieldInput: {
    flex: 1,
    color: WHITE,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingVertical: Platform.OS === 'web' ? 0 : 10,
  },

  /* Remember */
  rememberRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  rememberText: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 13 },
  checkbox: {
    width: 18, height: 18, borderRadius: 5,
    borderWidth: 1.5, borderColor: MUTED,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: CORAL, borderColor: CORAL },

  /* Error banner */
  errorBanner: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: ERROR_BG,
    borderWidth: 1,
    borderColor: ERROR_BDR,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: CORAL,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },

  /* Login button */
  loginBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: CORAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: CORAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 18px rgba(232,133,106,0.35)' } as any,
    }),
  },
  loginBtnText: { color: WHITE, fontFamily: 'Inter_700Bold', fontSize: 16 },

  /* Links */
  linkRow: { alignItems: 'center', marginBottom: 14 },
  linkText: { color: CORAL, fontFamily: 'Inter_400Regular', fontSize: 14 },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  footerLink: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 13 },
  footerSep: { color: BORDER, fontSize: 13 },
  copyright: {
    color: '#243A50',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
});
