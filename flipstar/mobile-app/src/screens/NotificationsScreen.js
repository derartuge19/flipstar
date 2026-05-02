import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';

const GOLD = '#C8B56A';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function NotifIcon({ type }) {
  const map = {
    like: { name: 'heart', color: '#EF4444', bg: '#2D1010' },
    comment: { name: 'chatbubble', color: '#3B82F6', bg: '#0D1A2D' },
    follow: { name: 'person-add', color: '#10B981', bg: '#0D2D1A' },
    mention: { name: 'at', color: '#8B5CF6', bg: '#1A0D2D' },
    campaign: { name: 'trophy', color: GOLD, bg: '#2D2010' },
    gift: { name: 'gift', color: '#EC4899', bg: '#2D0D1A' },
  };
  const cfg = map[type] || { name: 'notifications', color: GOLD, bg: '#1A1A1A' };
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cfg.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={cfg.name} size={18} color={cfg.color} />
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.request('/notifications/');
      setNotifications(Array.isArray(data) ? data : (data.results || []));
      // Mark all as read
      api.request('/notifications/read/', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    } catch { setNotifications([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.unread]}
      onPress={() => {
        if (item.reel_id) navigation.navigate('ReelsDetail', { initialVideoId: item.reel_id });
        else if (item.actor_id) navigation.navigate('Profile', { userId: item.actor_id });
      }}
    >
      <View style={{ position: 'relative' }}>
        {item.actor?.profile_photo
          ? <Image source={{ uri: item.actor.profile_photo }} style={styles.avatar} />
          : <View style={[styles.avatar, { backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#000', fontWeight: '700' }}>{(item.actor?.username || '?')[0].toUpperCase()}</Text>
            </View>}
        <View style={styles.typeIcon}>
          <NotifIcon type={item.type} />
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.message} numberOfLines={2}>{item.message || item.text}</Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>
      {item.reel?.thumbnail_url && (
        <Image source={{ uri: item.reel.thumbnail_url }} style={styles.thumb} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      {loading
        ? <View style={styles.centered}><ActivityIndicator size="large" color={GOLD} /></View>
        : <FlatList
            data={notifications}
            keyExtractor={n => String(n.id)}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} tintColor={GOLD} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="notifications-off-outline" size={48} color="#333" />
                <Text style={{ color: '#666', marginTop: 12 }}>No notifications yet</Text>
              </View>
            }
          />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  unread: { backgroundColor: GOLD + '08' },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  typeIcon: { position: 'absolute', bottom: -4, right: -4, transform: [{ scale: 0.65 }] },
  message: { fontSize: 14, color: '#ddd', lineHeight: 19 },
  time: { fontSize: 12, color: '#666', marginTop: 3 },
  thumb: { width: 44, height: 44, borderRadius: 6, marginLeft: 10 },
});
