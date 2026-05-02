import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Modal, TextInput, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

const GOLD = '#C8B56A';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';
const TEXT = '#fff';
const SUB = '#666';

function SettingRow({ icon, label, subtitle, value, onPress, isSwitch, switchValue, onSwitch, danger, chevron = true }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={isSwitch} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? '#2D1010' : (GOLD + '20') }]}>
        <Ionicons name={icon} size={18} color={danger ? '#EF4444' : GOLD} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {isSwitch && <Switch value={switchValue} onValueChange={onSwitch} trackColor={{ true: GOLD, false: BORDER }} thumbColor="#fff" />}
        {!isSwitch && chevron && <Ionicons name="chevron-forward" size={18} color={SUB} />}
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SectionLabel({ children }) {
  return (
    <Text style={styles.sectionLabel}>{children}</Text>
  );
}

function SectionCard({ children }) {
  return (
    <View style={styles.sectionCard}>{children}</View>
  );
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  const [notifications, setNotifications] = useState(() => {
    return {
      likes: true,
      comments: true,
      follows: true,
      messages: true,
    };
  });
  
  const [privacy, setPrivacy] = useState(() => {
    return {
      privateAccount: false,
      showActivity: true,
      allowMessages: true,
    };
  });
  
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  
  const [showPassModal, setShowPassModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const notifData = await AsyncStorage.getItem('notifications');
        if (notifData) setNotifications(JSON.parse(notifData));
        
        const privacyData = await AsyncStorage.getItem('privacy');
        if (privacyData) setPrivacy(JSON.parse(privacyData));
      } catch {}
    };
    loadSettings();

    // Load blocked users
    const loadBlockedUsers = async () => {
      try {
        setLoadingBlocked(true);
        const data = await api.getBlockedUsers();
        const users = Array.isArray(data) ? data : (data.results || []);
        setBlockedUsers(users.map(b => b.blocked));
      } catch (error) {
        console.error('Failed to load blocked users:', error);
      } finally {
        setLoadingBlocked(false);
      }
    };
    loadBlockedUsers();
  }, []);

  // Save settings to AsyncStorage whenever they change
  useEffect(() => {
    AsyncStorage.setItem('notifications', JSON.stringify(notifications)).catch(() => {});
  }, [notifications]);

  useEffect(() => {
    AsyncStorage.setItem('privacy', JSON.stringify(privacy)).catch(() => {});
  }, [privacy]);

  const handleNotificationToggle = async (key) => {
    const newVal = !notifications[key];
    const next = { ...notifications, [key]: newVal };
    setNotifications(next);
    // Settings are saved to AsyncStorage in useEffect
  };

  const handlePrivacyToggle = async (key) => {
    const newVal = !privacy[key];
    const next = { ...privacy, [key]: newVal };
    setPrivacy(next);
    // Settings are saved to AsyncStorage in useEffect
  };

  const handleResetSuggestions = async () => {
    Alert.alert(
      'Reset Suggested Content',
      'This will clear your recommendation history and start fresh. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear dismissed users from AsyncStorage
              await AsyncStorage.removeItem('dismissedSuggestions');
              // Clear any other suggestion-related data
              await AsyncStorage.removeItem('suggestionHistory');
              Alert.alert('Success', 'Your suggested content has been reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset suggestions');
            }
          }
        }
      ]
    );
  };

  const handlePasswordChange = async () => {
    if (password.new !== password.confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.new.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    try {
      await api.request('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({ old_password: password.current, new_password: password.new })
      });
      Alert.alert('Success', 'Password changed successfully');
      setPassword({ current: '', new: '', confirm: '' });
      setShowPassModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This action is permanent and cannot be undone. All your data will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        Alert.alert('Final Confirmation', 'Are you absolutely sure you want to delete your account? This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await api.request('/auth/delete-account/', { method: 'POST' });
              Alert.alert('Account Deleted', 'Your account is being deleted', [
                { text: 'OK', onPress: logout }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          }},
        ]);
      }},
    ]);
  };

  const handleDownloadData = async () => {
    try {
      await api.request('/auth/download-data/', { method: 'POST' });
      Alert.alert('Download Initiated', 'Your data will be sent to your email shortly');
    } catch (error) {
      Alert.alert('Error', 'Failed to request data download');
    }
  };

  const handleUnblockUser = async (userId, username) => {
    try {
      await api.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      Alert.alert('Success', `Unblocked ${username}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const languages = [
    { id: 'en', label: 'English' },
    { id: 'am', label: 'አማርኛ (Amharic)' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'ar', label: 'العربية' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Summary */}
        <View style={styles.profileSummary}>
          <View style={styles.avatar}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() || 'U'}</Text>
            )}
          </View>
          <Text style={styles.username}>@{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <SectionCard>
          <SettingRow icon="person-outline" label="Edit Profile" subtitle="Change bio and photo" onPress={() => navigation.navigate('EditProfile')} />
          <SettingRow icon="wallet-outline" label="Wallet" subtitle="Coins & transactions" onPress={() => navigation.navigate('Wallet')} />
          <SettingRow icon="ribbon" label="Subscription" subtitle="Plans & billing" onPress={() => navigation.navigate('Subscription')} />
          <SettingRow icon="lock-closed-outline" label="Change Password" onPress={() => setShowPassModal(true)} />
          <SettingRow icon="download-outline" label="Download Data" subtitle="Get a copy of your data" onPress={handleDownloadData} />
        </SectionCard>

        {/* Notifications */}
        <SectionLabel>Notifications</SectionLabel>
        <SectionCard>
          <SettingRow icon="heart-outline" label="Likes" isSwitch switchValue={notifications.likes} onSwitch={() => handleNotificationToggle('likes')} />
          <SettingRow icon="chatbubble-outline" label="Comments" isSwitch switchValue={notifications.comments} onSwitch={() => handleNotificationToggle('comments')} />
          <SettingRow icon="people-outline" label="Follows" isSwitch switchValue={notifications.follows} onSwitch={() => handleNotificationToggle('follows')} />
          <SettingRow icon="mail-outline" label="Messages" isSwitch switchValue={notifications.messages} onSwitch={() => handleNotificationToggle('messages')} />
        </SectionCard>

        {/* Privacy */}
        <SectionLabel>Privacy</SectionLabel>
        <SectionCard>
          <SettingRow icon="eye-off-outline" label="Private Account" subtitle="Only followers can see your posts" isSwitch switchValue={privacy.privateAccount} onSwitch={() => handlePrivacyToggle('privateAccount')} />
          <SettingRow icon="pulse-outline" label="Show Activity" subtitle="Show your activity status" isSwitch switchValue={privacy.showActivity} onSwitch={() => handlePrivacyToggle('showActivity')} />
          <SettingRow icon="mail-outline" label="Allow Messages" subtitle="Receive messages from anyone" isSwitch switchValue={privacy.allowMessages} onSwitch={() => handlePrivacyToggle('allowMessages')} />
          <SettingRow icon="refresh-outline" label="Reset Suggested Content" subtitle="Clear your recommendation history" onPress={handleResetSuggestions} />
        </SectionCard>

        {/* Appearance */}
        <SectionLabel>Appearance</SectionLabel>
        <SectionCard>
          <SettingRow icon={darkMode ? "moon-outline" : "sunny-outline"} label="Dark Mode" isSwitch switchValue={darkMode} onSwitch={() => setDarkMode(!darkMode)} />
          <SettingRow icon="globe-outline" label="Language" subtitle={language === 'en' ? 'English' : language === 'am' ? 'አማርኛ' : language} onPress={() => setShowLangModal(true)} />
        </SectionCard>

        {/* Help */}
        <SectionLabel>Help</SectionLabel>
        <SectionCard>
          <SettingRow icon="help-circle-outline" label="Help Center" onPress={() => Alert.alert('Help', 'Contact support@flipstar.com')} />
          <SettingRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Alert.alert('Privacy Policy', 'Opening privacy policy...')} />
          <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => Alert.alert('Terms of Service', 'Opening terms of service...')} />
        </SectionCard>

        {/* Blocked Users */}
        <SectionLabel>Blocked Users</SectionLabel>
        <SectionCard>
          {loadingBlocked ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={GOLD} />
            </View>
          ) : blockedUsers.length === 0 ? (
            <Text style={{ color: SUB, fontSize: 14, padding: 20 }}>No blocked users</Text>
          ) : (
            blockedUsers.map(blockedUser => (
              <View key={blockedUser.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER + '80' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BORDER, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  {blockedUser.profile_photo ? (
                    <Image source={{ uri: blockedUser.profile_photo }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Ionicons name="person" size={16} color={SUB} />
                  )}
                </View>
                <Text style={{ flex: 1, marginLeft: 12, color: TEXT, fontSize: 15 }}>{blockedUser.username}</Text>
                <TouchableOpacity onPress={() => handleUnblockUser(blockedUser.id, blockedUser.username)}>
                  <Text style={{ color: GOLD, fontSize: 14, fontWeight: '600' }}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </SectionCard>

        {/* Danger Zone */}
        <SectionLabel>Danger Zone</SectionLabel>
        <SectionCard>
          <SettingRow icon="trash-outline" label="Delete Account" danger onPress={handleDeleteAccount} />
        </SectionCard>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.copyright}>© 2024 FlipStar Inc.</Text>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
          <TouchableOpacity style={styles.bottomSheet} activeOpacity={1}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Choose Language</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Ionicons name="close" size={22} color={TEXT} />
              </TouchableOpacity>
            </View>
            <View style={styles.bottomSheetContent}>
              {languages.map(l => (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => { setLanguage(l.id); setShowLangModal(false); }}
                  style={styles.languageRow}
                >
                  <Text style={[styles.languageLabel, { color: language === l.id ? GOLD : TEXT }]}>{l.label}</Text>
                  {language === l.id && <Ionicons name="checkmark" size={20} color={GOLD} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPassModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPassModal(false)}>
          <TouchableOpacity style={styles.bottomSheet} activeOpacity={1}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPassModal(false)}>
                <Ionicons name="close" size={22} color={TEXT} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <View style={styles.passwordField}>
                <Text style={styles.passwordLabel}>Current Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry
                  placeholder="Enter current password"
                  placeholderTextColor="#666"
                  value={password.current}
                  onChangeText={text => setPassword(prev => ({ ...prev, current: text }))}
                />
              </View>
              <View style={styles.passwordField}>
                <Text style={styles.passwordLabel}>New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry
                  placeholder="Enter new password"
                  placeholderTextColor="#666"
                  value={password.new}
                  onChangeText={text => setPassword(prev => ({ ...prev, new: text }))}
                />
              </View>
              <View style={styles.passwordField}>
                <Text style={styles.passwordLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry
                  placeholder="Confirm new password"
                  placeholderTextColor="#666"
                  value={password.confirm}
                  onChangeText={text => setPassword(prev => ({ ...prev, confirm: text }))}
                />
              </View>
              <TouchableOpacity style={styles.updateButton} onPress={handlePasswordChange}>
                <Text style={styles.updateButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  
  profileSummary: { flexDirection: 'column', alignItems: 'center', padding: 28, backgroundColor: CARD, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#000' },
  username: { fontSize: 18, fontWeight: '800', color: TEXT },
  email: { fontSize: 13, color: SUB, marginTop: 2 },
  
  sectionLabel: { fontSize: 12, fontWeight: '700', color: SUB, textTransform: 'uppercase', letterSpacing: 1.2, marginHorizontal: 20, marginTop: 20, marginBottom: 8 },
  sectionCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, overflow: 'hidden' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: SUB, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER + '80' },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowLabel: { fontSize: 15, color: TEXT, fontWeight: '500' },
  rowSubtitle: { fontSize: 12, color: SUB, marginTop: 2 },
  rowValue: { fontSize: 13, color: SUB },
  
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 24, padding: 16, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16 },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
  
  footer: { alignItems: 'center', padding: 32 },
  version: { fontSize: 12, fontWeight: '600', color: SUB },
  copyright: { fontSize: 10, color: SUB, opacity: 0.6, marginTop: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { width: '100%', backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: BORDER },
  bottomSheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  bottomSheetContent: { padding: '8px 20px' },
  languageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  languageLabel: { fontSize: 16, fontWeight: '600' },
  
  passwordField: { marginBottom: 14 },
  passwordLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 6 },
  passwordInput: { width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, color: TEXT, fontSize: 15 },
  updateButton: { width: '100%', marginTop: 12, padding: 16, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center' },
  updateButtonText: { color: '#000', fontSize: 15, fontWeight: '800' },
  
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  alertBox: { backgroundColor: CARD, borderRadius: 16, padding: 20, maxWidth: 360, width: '100%' },
  alertTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  alertMessage: { fontSize: 14, color: TEXT, lineHeight: 20, marginBottom: 16 },
  alertButtons: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  alertButton: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  alertButtonText: { fontSize: 13, fontWeight: '600', color: TEXT },
  alertButtonPrimary: { backgroundColor: GOLD, borderWidth: 0 },
});
