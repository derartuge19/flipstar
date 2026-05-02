import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const GOLD = '#C8B56A';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, loadUser } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', bio: '' });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        bio: user.bio || '',
      });
      setPhoto(user.profile_photo || null);
    }
  }, [user]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.length) setPhoto(result.assets[0].uri);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('first_name', form.first_name);
      fd.append('last_name', form.last_name);
      fd.append('username', form.username);
      fd.append('bio', form.bio);
      if (photo && photo !== user?.profile_photo) {
        const uri = photo;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const type = 'image/jpeg';
        fd.append('profile_photo', { uri, type, name: filename });
      }
      const response = await api.request('/profile/update_profile/', { method: 'PATCH', body: fd, isFormData: true });
      console.log('Profile update response:', response);
      await loadUser();
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      console.error('Profile update error:', e);
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={GOLD} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={pickPhoto}>
          {photo
            ? <Image source={{ uri: photo }} style={styles.avatar} />
            : <View style={[styles.avatar, { backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#000', fontSize: 32, fontWeight: '700' }}>{(form.username || '?')[0].toUpperCase()}</Text>
              </View>}
          <View style={styles.editPhotoOverlay}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.changePhotoText}>Change photo</Text>

        {/* Fields */}
        {[
          { key: 'first_name', label: 'First Name', placeholder: 'Enter first name' },
          { key: 'last_name', label: 'Last Name', placeholder: 'Enter last name' },
          { key: 'username', label: 'Username', placeholder: 'Enter username' },
        ].map(f => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={form[f.key]}
              onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
              placeholder={f.placeholder}
              placeholderTextColor="#555"
              autoCapitalize={f.key === 'username' ? 'none' : 'words'}
            />
          </View>
        ))}

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
            value={form.bio}
            onChangeText={v => setForm(p => ({ ...p, bio: v }))}
            placeholder="Write something about yourself..."
            placeholderTextColor="#555"
            multiline
            maxLength={150}
          />
          <Text style={styles.charCount}>{form.bio.length}/150</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  saveBtn: { color: GOLD, fontSize: 15, fontWeight: '700' },
  avatarContainer: { alignSelf: 'center', marginBottom: 12, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: GOLD },
  editPhotoOverlay: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BG },
  changePhotoText: { textAlign: 'center', color: GOLD, fontSize: 14, fontWeight: '600', marginBottom: 28 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: GOLD, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16 },
  charCount: { fontSize: 12, color: '#666', textAlign: 'right', marginTop: 6 },
});
