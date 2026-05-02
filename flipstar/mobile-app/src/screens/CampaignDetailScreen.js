import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';

const GOLD = '#C8B56A';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';

function timeLeft(endDate) {
  if (!endDate) return '';
  const diff = new Date(endDate) - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? (d + 'd ' + h + 'h left') : (h + 'h left');
}

export default function CampaignDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { campaignId } = route.params;
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => { loadCampaign(); }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const data = await api.request('/campaigns/' + campaignId + '/');
      setCampaign(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load campaign.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.request('/campaigns/' + campaignId + '/enter/', { method: 'POST' });
      Alert.alert('Joined!', 'You have successfully joined this campaign.');
      loadCampaign();
    } catch (e) {
      Alert.alert('Error', (e && e.message) ? e.message : 'Could not join.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size='large' color={GOLD} /></View>;
  if (!campaign) return null;
  const isActive = campaign.status === 'active';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name='chevron-back' size={24} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Campaign</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {campaign.banner_image ? (
          <Image source={{ uri: campaign.banner_image }} style={styles.banner} resizeMode='cover' />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder]}>
            <Ionicons name='trophy' size={56} color={GOLD} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, isActive && styles.statusActive, campaign.status === 'ended' && styles.statusEnded]}>
              <Text style={styles.statusText}>{campaign.status ? campaign.status.toUpperCase() : ''}</Text>
            </View>
            {campaign.end_date ? <Text style={styles.timeLeft}>{timeLeft(campaign.end_date)}</Text> : null}
          </View>
          <Text style={styles.title}>{campaign.title}</Text>
          {campaign.description ? <Text style={styles.description}>{campaign.description}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name='trophy-outline' size={20} color={GOLD} />
              <Text style={styles.statLabel}>Prize</Text>
              <Text style={styles.statValue}>{campaign.prize_description || (campaign.prize_amount ? campaign.prize_amount + ' ETB' : '-')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name='people-outline' size={20} color={GOLD} />
              <Text style={styles.statLabel}>Entries</Text>
              <Text style={styles.statValue}>{campaign.entries_count != null ? campaign.entries_count : 0}</Text>
            </View>
          </View>
          {campaign.rules ? <View style={styles.section}><Text style={styles.sectionTitle}>Rules</Text><Text style={styles.sectionText}>{campaign.rules}</Text></View> : null}
          {campaign.requirements ? <View style={styles.section}><Text style={styles.sectionTitle}>Requirements</Text><Text style={styles.sectionText}>{campaign.requirements}</Text></View> : null}
        </View>
      </ScrollView>
      {isActive ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={[styles.joinBtn, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
            {joining ? <ActivityIndicator size='small' color='#000' /> : <Text style={styles.joinBtnText}>Join Campaign</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GOLD, flex: 1, textAlign: 'center' },
  banner: { width: '100%', height: 220 },
  bannerPlaceholder: { backgroundColor: '#1A1200', justifyContent: 'center', alignItems: 'center' },
  body: { padding: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#333' },
  statusActive: { backgroundColor: '#14532D' },
  statusEnded: { backgroundColor: '#3B0000' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  timeLeft: { color: '#888', fontSize: 13 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
  description: { fontSize: 14, color: '#aaa', lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 24, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 4 },
  statValue: { fontSize: 13, color: '#fff', fontWeight: '700', textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: BORDER },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: GOLD, marginBottom: 8 },
  sectionText: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG },
  joinBtn: { backgroundColor: GOLD, borderRadius: 14, padding: 16, alignItems: 'center' },
  joinBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  content: { paddingBottom: 20 },
});

