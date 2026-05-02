import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';

const GOLD = '#C8B56A';
const LIGHT_GOLD = '#F9E08B';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';

export default function LeaderboardScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { campaignId, campaign } = route.params || {};
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadLeaderboard();
    }
    setIsVoting(campaign?.status === 'voting');
  }, [campaignId, campaign]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/campaigns/${campaignId}/leaderboard/`);
      setEntries(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard');
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVote = async (entryId) => {
    try {
      await api.request(`/campaigns/entries/${entryId}/vote/`, { method: 'POST' });
      
      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, vote_count: (entry.vote_count || 0) + 1, user_voted: true }
          : entry
      ));
      
      Alert.alert('Success', 'Vote recorded!');
    } catch (error) {
      console.error('Vote failed:', error);
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const renderLeaderboardItem = ({ item, index }) => {
    const getRankBadge = () => {
      if (!item.rank || item.rank > 3) return null;
      const badges = {
        1: { color: '#FFD700', icon: '🥇' },
        2: { color: '#C0C0C0', icon: '🥈' },
        3: { color: '#CD7F32', icon: '🥉' },
      };
      return badges[item.rank];
    };

    const rankBadge = getRankBadge();

    return (
      <View style={styles.leaderboardItem}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          {rankBadge ? (
            <View style={[styles.rankBadge, { backgroundColor: rankBadge.color }]}>
              <Text style={styles.rankBadgeIcon}>{rankBadge.icon}</Text>
            </View>
          ) : (
            <Text style={styles.rankNumber}>#{item.rank || index + 1}</Text>
          )}
        </View>

        {/* User Avatar */}
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {item.user?.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.user?.username || 'Anonymous'}</Text>
          {item.caption && (
            <Text style={styles.caption} numberOfLines={1}>
              {item.caption}
            </Text>
          )}
        </View>

        {/* Vote Count */}
        <View style={styles.voteCount}>
          <Ionicons name="heart" size={16} color="#EF4444" />
          <Text style={styles.voteNumber}>{item.vote_count || 0}</Text>
        </View>

        {/* Vote Button */}
        {isVoting && (
          <TouchableOpacity 
            style={[
              styles.voteButton,
              item.user_voted && styles.votedButton
            ]}
            onPress={() => handleVote(item.id)}
            disabled={item.user_voted}
          >
            <Ionicons 
              name={item.user_voted ? "heart" : "heart-outline"} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.voteButtonText}>
              {item.user_voted ? 'Voted' : 'Vote'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={GOLD} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Campaign Info */}
      {campaign && (
        <View style={styles.campaignInfo}>
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignStatus}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      )}

      {/* Leaderboard List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderLeaderboardItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadLeaderboard} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="#888" />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to join this campaign!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 14, marginTop: 12 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT_GOLD,
    flex: 1,
    textAlign: 'center',
  },

  // Campaign Info
  campaignInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT_GOLD,
    marginBottom: 4,
  },
  campaignStatus: {
    fontSize: 12,
    color: '#888',
  },

  // List
  listContainer: {
    padding: 16,
  },

  // Leaderboard Items
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  
  // Rank
  rankContainer: {
    width: 60,
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rankBadgeIcon: {
    fontSize: 20,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888',
  },

  // User Avatar
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'linear-gradient(135deg, #DA9B2A, #F97316)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // User Info
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT_GOLD,
    marginBottom: 4,
  },
  caption: {
    fontSize: 13,
    color: '#888',
  },

  // Vote Count
  voteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
  },
  voteNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Vote Button
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  votedButton: {
    backgroundColor: '#10B981',
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT_GOLD,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
