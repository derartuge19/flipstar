import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const GOLD = '#C8B56A';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';

const FAQ_ITEMS = [
  { q: "What is FlipStar?", a: "FlipStar is an Ethiopian social video platform where you can share short videos, join campaigns, win prizes, and earn coins." },
  { q: "How do I earn coins?", a: "You earn coins by posting videos, daily login streaks, receiving gifts from followers, and winning campaigns." },
  { q: "How do I join a campaign?", a: "Go to the Campaigns tab, browse active campaigns, and submit your video entry. Winners are chosen by votes or judges." },
  { q: "Is FlipStar free?", a: "Yes! FlipStar is completely free. Premium features like extra campaign entries are available for purchase." },
  { q: "Who can register?", a: "Anyone with an Ethiopian phone number (+251) can register. You'll verify your number with an OTP code." },
  { q: "How do I reset my password?", a: "Tap 'Forgot password?' on the login screen. A 6-digit reset code will be sent to your registered email address." },
];

const TERMS = `TERMS & CONDITIONS — FlipStar

1. ELIGIBILITY
You must have a valid Ethiopian phone number to register.

2. CONTENT
You are responsible for all content you post. No harmful, offensive or illegal content is allowed.

3. COINS & PRIZES
Coins have no cash value unless explicitly redeemable in a campaign. Prize delivery is subject to campaign rules.

4. PRIVACY
Your phone number is used only for verification. It will never be shared with third parties.

5. ACCOUNT SECURITY
Your 6-digit PIN is your responsibility. Do not share it. FlipStar staff will never ask for your PIN.

6. TERMINATION
Accounts violating these terms may be suspended or permanently banned.

7. CHANGES
FlipStar reserves the right to update these terms at any time. Continued use constitutes acceptance.

Contact: support@flipstar.app`;

// ── Forgot Password Modal ──────────────────────────────────────────────────
function ForgotModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const sendCode = async () => {
    setError(''); setMsg('');
    if (!email) { setError('Enter your email'); return; }
    setLoading(true);
    try {
      await api.request('/auth/forgot-password/', { method: 'POST', body: JSON.stringify({ email }) });
      setMsg('Reset code sent! Check your email.');
      setStep(2);
    } catch (e) { setError(e?.message || 'Failed to send code'); }
    finally { setLoading(false); }
  };

  const confirmReset = async () => {
    setError(''); setMsg('');
    if (code.length !== 6) { setError('Enter the 6-digit code from your email'); return; }
    if (!/^\d{6}$/.test(pwd)) { setError('New password must be exactly 6 digits'); return; }
    if (pwd !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.request('/auth/forgot-password/confirm/', { method: 'POST', body: JSON.stringify({ email, code, new_password: pwd }) });
      setStep(3);
    } catch (e) { setError(e?.message || 'Invalid or expired code'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {step === 1 ? 'Forgot Password' : step === 2 ? 'Enter Reset Code' : 'Password Reset!'}
            </Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={GOLD} /></TouchableOpacity>
          </View>

          {!!error && <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View>}
          {!!msg && <View style={s.successBox}><Text style={s.successText}>{msg}</Text></View>}

          {step === 1 && (
            <>
              <Text style={s.modalDesc}>Enter the email you registered with. A 6-digit reset code will be sent to it.</Text>
              <TextInput style={s.input} placeholder="your@email.com" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <TouchableOpacity style={[s.goldBtn, loading && s.goldBtnDisabled]} onPress={sendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={s.goldBtnText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.modalDesc}>Enter the 6-digit code sent to <Text style={{ color: '#fff', fontWeight: '700' }}>{email}</Text> and your new 6-digit PIN.</Text>
              <TextInput style={s.input} placeholder="6-digit code from email" placeholderTextColor="#555" value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
              <View style={{ position: 'relative' }}>
                <TextInput style={[s.input, { paddingRight: 48 }]} placeholder="New 6-digit PIN" placeholderTextColor="#555" value={pwd} onChangeText={t => setPwd(t.replace(/\D/g, '').slice(0, 6))} secureTextEntry={!showPwd} keyboardType="number-pad" maxLength={6} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                  <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color={GOLD} />
                </TouchableOpacity>
              </View>
              <TextInput style={s.input} placeholder="Confirm new PIN" placeholderTextColor="#555" value={confirm} onChangeText={t => setConfirm(t.replace(/\D/g, '').slice(0, 6))} secureTextEntry keyboardType="number-pad" maxLength={6} />
              <TouchableOpacity style={[s.goldBtn, loading && s.goldBtnDisabled]} onPress={confirmReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={s.goldBtnText}>Reset Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep(1); setCode(''); setError(''); setMsg(''); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                <Ionicons name="chevron-back" size={14} color={GOLD} />
                <Text style={{ color: GOLD, fontSize: 13 }}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: GOLD, marginBottom: 8 }}>Password Reset!</Text>
              <Text style={{ fontSize: 13, color: GOLD, marginBottom: 24, textAlign: 'center' }}>You can now log in with your new PIN.</Text>
              <TouchableOpacity style={s.goldBtn} onPress={onClose}>
                <Text style={s.goldBtnText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── FAQ Modal ──────────────────────────────────────────────────────────────
function FaqModal({ onClose }) {
  const [open, setOpen] = useState(null);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>FAQ</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={GOLD} /></TouchableOpacity>
          </View>
          <ScrollView>
            {FAQ_ITEMS.map((item, i) => (
              <View key={i} style={s.faqItem}>
                <TouchableOpacity style={s.faqQ} onPress={() => setOpen(open === i ? null : i)}>
                  <Text style={s.faqQText}>{item.q}</Text>
                  <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={GOLD} />
                </TouchableOpacity>
                {open === i && <Text style={s.faqA}>{item.a}</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Terms Modal ────────────────────────────────────────────────────────────
function TermsModal({ onClose }) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Terms & Conditions</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={GOLD} /></TouchableOpacity>
          </View>
          <ScrollView><Text style={s.termsText}>{TERMS}</Text></ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Login Screen ──────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'forgot' | 'faq' | 'terms'
  const [focusedUser, setFocusedUser] = useState(false);
  const [focusedPwd, setFocusedPwd] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setError('Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      {modal === 'forgot' && <ForgotModal onClose={() => setModal(null)} />}
      {modal === 'faq' && <FaqModal onClose={() => setModal(null)} />}
      {modal === 'terms' && <TermsModal onClose={() => setModal(null)} />}

      <ScrollView style={s.container} contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        {/* Logos */}
        <View style={s.logosRow}>
          <Image 
            source={require('../../../assets/images/ethio-logo.png')} 
            style={s.ethioLogo}
            resizeMode="contain"
          />
          <Image 
            source={require('../../../assets/images/flipstar-logo.png')} 
            style={s.flipstarLogo}
            resizeMode="contain"
          />
        </View>

        {/* Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Welcome Back!</Text>
            <Text style={s.cardSubtitle}>Log in to continue to FLIPSTAR</Text>
          </View>

          {!!error && <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View>}

          {/* Username */}
          <Text style={s.label}>USERNAME</Text>
          <View style={[s.inputRow, focusedUser && s.inputRowFocused]}>
            <Ionicons name="person-outline" size={17} color={GOLD} style={s.inputIcon} />
            <TextInput
              style={s.textInput}
              placeholder="Enter your username"
              placeholderTextColor="#555"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              onFocus={() => setFocusedUser(true)}
              onBlur={() => setFocusedUser(false)}
            />
          </View>

          {/* Password */}
          <Text style={s.label}>6-DIGIT PIN</Text>
          <View style={[s.inputRow, focusedPwd && s.inputRowFocused]}>
            <Ionicons name="lock-closed-outline" size={17} color={GOLD} style={s.inputIcon} />
            <TextInput
              style={[s.textInput, { flex: 1 }]}
              placeholder="••••••"
              placeholderTextColor="#555"
              value={password}
              onChangeText={t => setPassword(t.replace(/\D/g, '').slice(0, 6))}
              secureTextEntry={!showPwd}
              keyboardType="number-pad"
              maxLength={6}
              onFocus={() => setFocusedPwd(true)}
              onBlur={() => setFocusedPwd(false)}
            />
            <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={{ padding: 4 }}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={17} color={GOLD} />
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={s.forgotRow} onPress={() => setModal('forgot')}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity style={[s.goldBtn, loading && s.goldBtnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={s.goldBtnText}>Log In</Text>}
          </TouchableOpacity>

          {/* Sign up */}
          <View style={s.signupRow}>
            <Text style={s.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.signupLink}>Sign up free</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity onPress={() => setModal('faq')}><Text style={s.footerLink}>FAQ</Text></TouchableOpacity>
          <Text style={s.footerSep}>|</Text>
          <TouchableOpacity onPress={() => setModal('terms')}><Text style={s.footerLink}>Terms & Conditions</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },
  logosRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24, 
    borderRadius: 12, 
    padding: '10px 12px',
    backgroundColor: '#1A1A1A',
  },
  ethioLogo: { width: 100, height: 50 },
  flipstarLogo: { width: 100, height: 50 },
  card: { backgroundColor: CARD, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: GOLD + '30', marginBottom: 20 },
  cardHeader: { alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: GOLD, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: GOLD, opacity: 0.8 },
  errorBox: { backgroundColor: '#2D1010', borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, padding: 10, marginBottom: 16 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: '#1A2A1A', borderWidth: 1, borderColor: '#22C55E', borderRadius: 8, padding: 10, marginBottom: 16 },
  successText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: GOLD, marginBottom: 7, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, height: 50, marginBottom: 16 },
  inputRowFocused: { borderColor: GOLD },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#fff' },
  eyeBtn: { padding: 4 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 20, marginTop: -8 },
  forgotText: { color: GOLD, fontSize: 12, fontWeight: '700' },
  goldBtn: { backgroundColor: GOLD, borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  goldBtnDisabled: { backgroundColor: '#3A3A3A' },
  goldBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  signupRow: { flexDirection: 'row', justifyContent: 'center' },
  signupText: { fontSize: 13, color: '#666' },
  signupLink: { fontSize: 13, color: GOLD, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingBottom: 20 },
  footerLink: { color: GOLD, fontSize: 13, fontWeight: '600' },
  footerSep: { color: BORDER, fontSize: 13 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#111', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, paddingBottom: 40, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: GOLD },
  modalDesc: { fontSize: 13, color: GOLD, marginBottom: 16, lineHeight: 20 },
  input: { backgroundColor: CARD, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15, marginBottom: 12 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: BORDER },
  faqQ: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  faqQText: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  faqA: { fontSize: 13, color: GOLD, paddingBottom: 14, lineHeight: 20 },
  termsText: { fontSize: 12, color: GOLD, lineHeight: 20 },
  position: { position: 'relative' },
});
