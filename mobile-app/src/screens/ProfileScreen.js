import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList,
  ActivityIndicator, ScrollView, Dimensions, Alert, RefreshControl,
  StatusBar, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const { width, height } = Dimensions.get('window');
const GOLD = '#C8B56A';
const LIGHT_GOLD = '#F9E08B';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';
const COLS = 3;

const mediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:8000${url}`;
};
const GAP = 1;
const ITEM_SIZE = Math.floor((width - (GAP * (COLS - 1)) - 32) / COLS);

export default function ProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user: authUser, logout } = useAuth();
  // authUser from /profile/me/ (UserProfileSerializer):
  //   authUser.id      = UserProfile.pk
  //   authUser.user.id = User.pk (or authUser.id if flat login response)
  const authProfileId = authUser?.id;
  const authUserId    = authUser?.user?.id || authUser?.id;
  const routeUserId   = route?.params?.userId;

  // isOwnProfile is STATE — set definitively after profile data loads so there
  // is zero chance of a stale/wrong value from timing or ID format differences.
  const [isOwnProfile, setIsOwnProfile] = useState(!routeUserId); // best initial guess

  // targetProfileId / targetUserId — best-effort before data loads
  const targetProfileId = !routeUserId ? authProfileId : routeUserId;
  const targetUserId    = !routeUserId ? authUserId    : routeUserId;

  // Seed own profile immediately from cached authUser so name/username appear at once
  const [profile, setProfile] = useState(!routeUserId ? authUser : null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [campaignStats, setCampaignStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [postsCount, setPostsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingUser, setReportingUser] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [showProfileZoom, setShowProfileZoom] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    bio: '',
    email: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Report reasons matching website
  const REPORT_REASONS = [
    { id: 'harassment', label: 'Harassment or Bullying', emoji: '😡' },
    { id: 'spam', label: 'Spam or Fake Account', emoji: '⚠️' },
    { id: 'inappropriate', label: 'Inappropriate Content', emoji: '😢' },
    { id: 'hate_speech', label: 'Hate Speech', emoji: '🚫' },
    { id: 'scam', label: 'Scam or Fraud', emoji: '💸' },
    { id: 'other', label: 'Other', emoji: '📋' },
  ];

  useEffect(() => { loadProfile(); }, [targetProfileId]);
  useEffect(() => { 
    if (activeTab === 'reels') loadReels();
    else if (activeTab === 'saved') loadSavedPosts();
    else if (activeTab === 'campaigns') loadCampaignStats();
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Own profile: use /profile/me/ so there is zero ID-mismatch risk.
      // Other profile: use /profile/{pk}/ with the UserProfile pk from route.
      const profileEndpoint = isOwnProfile ? '/profile/me/' : `/profile/${targetProfileId}/`;
      const [profileData, postsData, followersData, followingData] = await Promise.all([
        api.request(profileEndpoint),
        api.request(`/reels/?user=${targetUserId}`),
        api.request(`/follows/?following=${targetUserId}`),
        api.request(`/follows/?follower=${targetUserId}`),
      ]);

      setProfile(profileData);
      const postsList = Array.isArray(postsData) ? postsData : (postsData.results || []);
      setPosts(postsList);
      setPostsCount(postsData.count ?? postsList.length);
      setReels(postsList.filter(p => p.media));

      // followers_count and following_count come from the nested user object in UserProfileSerializer
      const nestedUser = profileData.user || profileData;
      const followersFromProfile = nestedUser.followers_count ?? null;
      const followingFromProfile = nestedUser.following_count ?? null;

      // Use API list counts as secondary source
      const followersList = Array.isArray(followersData) ? followersData : (followersData.results || []);
      const followingList = Array.isArray(followingData) ? followingData : (followingData.results || []);

      setFollowersCount(followersFromProfile !== null ? followersFromProfile : followersList.length);
      setFollowingCount(followingFromProfile !== null ? followingFromProfile : followingList.length);

      // ── Determine ownership from the ACTUAL returned profile data ──────────
      // Compare the profile's real User.id against every known auth ID.
      // This is the only 100 % reliable check — it works regardless of which
      // ID format was passed in route.params or stored in authUser.
      const profileUserId = nestedUser.id ?? profileData.id;
      const amOwner = !routeUserId
        || String(profileUserId) === String(authUserId)
        || String(profileUserId) === String(authProfileId)
        || String(profileData.id) === String(authProfileId);
      setIsOwnProfile(Boolean(amOwner));
      // ────────────────────────────────────────────────────────────────────────

      setIsFollowing(amOwner ? false : (nestedUser.is_following || profileData.is_following || false));
      setBioText(profileData.bio || nestedUser.bio || '');
      setEditForm({
        first_name: nestedUser.first_name || profileData.first_name || '',
        last_name: nestedUser.last_name || profileData.last_name || '',
        username: nestedUser.username || profileData.username || '',
        bio: profileData.bio || nestedUser.bio || '',
        email: nestedUser.email || profileData.email || '',
      });
    } catch (e) { console.warn('loadProfile error:', e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadReels = async () => {
    try {
      const reelsData = await api.request(`/reels/?user=${targetUserId}`);
      const reelsList = Array.isArray(reelsData) ? reelsData : (reelsData.results || []);
      setReels(reelsList.filter(p => p.media));
    } catch (e) { /* silent */ }
  };

  const loadSavedPosts = async () => {
    if (!isOwnProfile) return;
    try {
      const savedData = await api.request(`/reels/?saved=true`);
      setSavedPosts(Array.isArray(savedData) ? savedData : (savedData.results || []));
    } catch (e) { /* silent */ }
  };

  const loadCampaignStats = async () => {
    try {
      const campaignData = await api.request(`/campaigns/profile/${targetUserId || ''}`);
      setCampaignStats(campaignData);
    } catch (e) { /* silent */ }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const toggleFollow = async () => {
    // Hard guard: never let a user follow themselves regardless of UI state
    const tId = String(targetUserId);
    if (tId === String(authUserId) || tId === String(authProfileId)) return;
    const prev = isFollowing;
    setIsFollowing(!prev);
    setFollowersCount(c => prev ? c - 1 : c + 1);
    try {
      await api.request('/follows/toggle/', { method: 'POST', body: JSON.stringify({ following_id: targetUserId }) });
    } catch {
      setIsFollowing(prev);
      setFollowersCount(c => prev ? c + 1 : c - 1);
    }
  };

  const handleBlockUser = async () => {
    if (!user || user.id === targetUserId) return;
    
    Alert.alert(
      'Block User',
      `Block ${profileUser?.username}? They won't be able to find your profile, posts, or interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser(targetUserId);
              setIsBlocked(true);
              Alert.alert('Blocked', `Blocked ${profileUser?.username}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to block user');
            }
          }
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    try {
      await api.unblockUser(targetUserId);
      setIsBlocked(false);
      Alert.alert('Unblocked', `Unblocked ${profileUser?.username}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const handleReportUser = async (reason) => {
    setShowReportModal(false);
    setReportingUser(true);
    try {
      await api.request('/reports/create/', {
        method: 'POST',
        body: JSON.stringify({
          reported_user_id: targetUserId,
          report_type: reason,
          description: `User reported as: ${reason}`,
          target_type: 'user',
        }),
      });
      Alert.alert('Success', 'Report submitted. Thank you for keeping the community safe.');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setReportingUser(false);
    }
  };

  const handleShareProfile = () => {
    // In a real app, you'd use Share.share from react-native
    Alert.alert('Share', 'Profile link copied!');
  };

  const handleEditBio = async () => {
    if (!isOwnProfile) return;
    try {
      setSavingProfile(true);
      // Use the dedicated update_profile endpoint so bio is saved on the profile model
      await api.request('/profile/update_profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bioText }),
      });
      setProfile(prev => ({ ...prev, bio: bioText }));
      setEditingBio(false);
      Alert.alert('Success', 'Bio updated!');
    } catch (err) {
      Alert.alert('Error', 'Failed to update bio. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEditProfile = async () => {
    if (!isOwnProfile) return;
    // Basic validation
    if (!editForm.username.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    try {
      setSavingProfile(true);
      // /profile/update_profile/ correctly saves both User fields (username, email,
      // first_name, last_name) AND the UserProfile bio field in one request.
      const saved = await api.request('/profile/update_profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      // saved = { id, username, email, first_name, last_name, bio, profile_photo }
      // Merge into the nested structure that the display reads from
      setProfile(prev => ({
        ...prev,
        bio: saved.bio ?? editForm.bio ?? prev.bio,
        profile_photo: saved.profile_photo ?? prev.profile_photo,
        username: saved.username ?? editForm.username ?? prev.username,
        user: {
          ...(prev.user || {}),
          username:   saved.username   ?? editForm.username   ?? prev.user?.username,
          email:      saved.email      ?? editForm.email      ?? prev.user?.email,
          first_name: saved.first_name ?? editForm.first_name ?? prev.user?.first_name,
          last_name:  saved.last_name  ?? editForm.last_name  ?? prev.user?.last_name,
        },
      }));
      setBioText(saved.bio ?? editForm.bio ?? '');
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const currentTabContent = useMemo(() => {
    switch (activeTab) {
      case 'posts': return posts;
      case 'reels': return reels;
      case 'saved': return savedPosts;
      case 'campaigns': return [];
      default: return posts;
    }
  }, [activeTab, posts, reels, savedPosts]);

  const renderPost = useCallback(({ item, index }) => {
    const isVideo = !!(item.media || '').match(/\.(mp4|webm|ogg|mov)/i) || (item.media && item.media.includes('/video/'));
    const thumbnail = item.thumbnail_url || item.image || item.media;
    
    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          index === 0 && styles.heroItem
        ]}
        onPress={() => navigation.navigate('ReelsDetail', { initialVideoId: item.id })}
      >
        {thumbnail ? (
          <Image source={{ uri: mediaUrl(thumbnail) }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImage, styles.fallbackContainer]}>
            <Ionicons name={isVideo ? 'play' : 'image'} size={28} color="#666" />
          </View>
        )}
        
        {isVideo && (
          <View style={styles.videoIcon}>
            <Ionicons name="play" size={9} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GOLD} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        {isOwnProfile && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')} style={styles.headerButton}>
              <Ionicons name="wallet-outline" size={24} color={GOLD} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Subscription')} style={styles.headerButton}>
              <Ionicons name="ribbon" size={24} color={GOLD} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Gamification')} style={styles.headerButton}>
              <Ionicons name="diamond-outline" size={24} color={GOLD} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={24} color={GOLD} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {profile?.profile_photo ? (
                <TouchableOpacity onPress={() => setShowProfileZoom(true)}>
                  <Image 
                    source={{ uri: mediaUrl(profile.profile_photo) }} 
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Followers', { userId: targetUserId })}
                style={styles.statItem}
              >
                <Text style={styles.statNumber}>{followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Following', { userId: targetUserId })}
                style={styles.statItem}
              >
                <Text style={styles.statNumber}>{followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>
              {(profile?.user?.first_name || profile?.first_name)} {(profile?.user?.last_name || profile?.last_name)}
            </Text>
            <Text style={styles.profileUsername}>@{profile?.username || profile?.user?.username}</Text>
            {isOwnProfile && editingBio ? (
              <View style={styles.bioEditContainer}>
                <TextInput
                  style={styles.bioInput}
                  value={bioText}
                  onChangeText={setBioText}
                  placeholder="Add a bio..."
                  placeholderTextColor="#666"
                  multiline
                  maxLength={200}
                />
                <View style={styles.bioEditActions}>
                  <TouchableOpacity 
                    onPress={() => setEditingBio(false)} 
                    style={styles.bioCancelButton}
                  >
                    <Text style={styles.bioCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleEditBio} 
                    disabled={savingProfile}
                    style={[styles.bioSaveButton, savingProfile && styles.bioSaveButtonDisabled]}
                  >
                    <Text style={styles.bioSaveText}>
                      {savingProfile ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => isOwnProfile && setEditingBio(true)}>
                {profile?.bio ? (
                  <Text style={styles.profileBio}>{profile.bio}</Text>
                ) : (
                  isOwnProfile && (
                    <Text style={styles.addBioText}>Add a bio...</Text>
                  )
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {/* Edit Profile Button for Own Profile */}
          {isOwnProfile && (
            <TouchableOpacity 
              onPress={() => setShowEditProfile(true)}
              style={styles.editProfileButton}
            >
              <Ionicons name="create-outline" size={16} color={GOLD} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
          
          {/* Action Buttons for Other Profiles */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                onPress={toggleFollow}
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton
                ]}
              >
                <Ionicons 
                  name={isFollowing ? "checkmark" : "add"} 
                  size={18} 
                  color={isFollowing ? GOLD : '#000'} 
                />
                <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleShareProfile} style={styles.actionButton}>
                <Ionicons name="share-outline" size={18} color={GOLD} />
              </TouchableOpacity>
              
              {!isBlocked ? (
                <TouchableOpacity 
                  onPress={handleBlockUser} 
                  style={styles.actionButton}
                >
                  <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={handleUnblockUser} 
                  style={styles.actionButton}
                >
                  <Ionicons name="person-add-outline" size={18} color={GOLD} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                onPress={() => setShowReportModal(true)} 
                disabled={reportingUser}
                style={styles.actionButton}
              >
                <Ionicons name="flag-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { id: 'posts', icon: 'grid-outline', label: 'Posts' },
            { id: 'reels', icon: 'film-outline', label: 'Reels' },
            { id: 'saved', icon: 'bookmark-outline', label: 'Saved' },
            { id: 'campaigns', icon: 'trophy-outline', label: 'Campaigns' },
          ]
            .filter(tab => isOwnProfile || tab.id !== 'saved')
            .map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab
                ]}
              >
                <Ionicons 
                  name={tab.icon} 
                  size={22} 
                  color={activeTab === tab.id ? GOLD : '#666'} 
                />
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.activeTabLabel
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* Campaign Stats Content */}
        {activeTab === 'campaigns' && (
          <View style={styles.campaignsContent}>
            {!campaignStats ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={GOLD} />
                <Text style={styles.loadingText}>Loading campaign stats...</Text>
              </View>
            ) : !campaignStats.campaigns || campaignStats.campaigns.length === 0 ? (
              <View style={styles.emptyCampaigns}>
                <Ionicons name="trophy-outline" size={48} color="#666" />
                <Text style={styles.emptyCampaignsTitle}>No campaigns yet</Text>
                <Text style={styles.emptyCampaignsText}>Join a campaign to see your stats here!</Text>
              </View>
            ) : (
              <View>
                {/* Header */}
                <View style={styles.campaignHeader}>
                  <Ionicons name="trophy" size={22} color={GOLD} />
                  <Text style={styles.campaignTitle}>Campaign Achievements</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="target-outline" size={18} color={GOLD} />
                    <Text style={styles.statValue}>{campaignStats.total_campaigns || 0}</Text>
                    <Text style={styles.statLabel}>Campaigns</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="award-outline" size={18} color={GOLD} />
                    <Text style={styles.statValue}>{campaignStats.total_score || 0}</Text>
                    <Text style={styles.statLabel}>Total Score</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="trending-up-outline" size={18} color={GOLD} />
                    <Text style={styles.statValue}>#{campaignStats.best_rank || '-'}</Text>
                    <Text style={styles.statLabel}>Best Rank</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="calendar-outline" size={18} color={GOLD} />
                    <Text style={styles.statValue}>{campaignStats.current_streak || 0}</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                  </View>
                </View>

                {/* Campaign List */}
                <View style={styles.campaignList}>
                  <Text style={styles.campaignListTitle}>Active Campaigns</Text>
                  {campaignStats.campaigns.map((campaign) => (
                    <View key={campaign.campaign_id} style={styles.campaignItem}>
                      <View style={styles.campaignInfo}>
                        <Text style={styles.campaignName}>{campaign.campaign_title}</Text>
                        <Text style={styles.campaignDetails}>
                          {campaign.posts_count} posts · Rank #{campaign.rank || '-'}
                        </Text>
                      </View>
                      <View style={styles.campaignScore}>
                        <Text style={styles.campaignScoreText}>{campaign.total_score} pts</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Badges */}
                {campaignStats.badges && campaignStats.badges.length > 0 && (
                  <View style={styles.badgesSection}>
                    <Text style={styles.badgesTitle}>Badges Earned</Text>
                    <View style={styles.badgesList}>
                      {campaignStats.badges.map((badge, idx) => (
                        <View key={idx} style={styles.badgeItem}>
                          <Ionicons name="award" size={13} color={GOLD} />
                          <Text style={styles.badgeText}>{badge.title}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Posts Grid */}
        {activeTab !== 'campaigns' && (
          <View style={styles.postsGrid}>
            {currentTabContent.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={
                    activeTab === 'posts' ? 'grid-outline' : 
                    activeTab === 'reels' ? 'film-outline' : 
                    'bookmark-outline'
                  } 
                  size={48} 
                  color="#666" 
                />
                <Text style={styles.emptyText}>
                  {activeTab === 'posts' ? 'No posts yet' : 
                   activeTab === 'reels' ? 'No reels yet' : 
                   'No saved posts yet'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={currentTabContent}
                renderItem={renderPost}
                keyExtractor={(item) => item.id.toString()}
                numColumns={COLS}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContainer}
                removeClippedSubviews={true}
                maxToRenderPerBatch={9}
                windowSize={5}
                initialNumToRender={9}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Profile Zoom Modal */}
      <Modal
        visible={showProfileZoom}
        transparent={true}
        onRequestClose={() => setShowProfileZoom(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowProfileZoom(false)}
        >
          {profile?.profile_photo && (
            <Image 
              source={{ uri: mediaUrl(profile.profile_photo) }} 
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowEditProfile(false)}
        >
          <TouchableOpacity 
            style={styles.editProfileModal} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editProfileHeader}>
              <Text style={styles.editProfileTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editProfileContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.first_name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, first_name: text }))}
                  placeholder="First name"
                  placeholderTextColor="#666"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.last_name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, last_name: text }))}
                  placeholder="Last name"
                  placeholderTextColor="#666"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.username}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
                  placeholder="Username"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={editForm.bio}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, bio: text }))}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#666"
                  multiline
                  maxLength={200}
                />
              </View>
            </ScrollView>
            
            <View style={styles.editProfileActions}>
              <TouchableOpacity 
                onPress={() => setShowEditProfile(false)} 
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleEditProfile} 
                disabled={savingProfile}
                style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Report User</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.reportReasons}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  onPress={() => handleReportUser(reason.id)}
                  style={styles.reportReason}
                >
                  <Text style={styles.reportEmoji}>{reason.emoji}</Text>
                  <Text style={styles.reportReasonText}>{reason.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    padding: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CARD,
  },
  avatarPlaceholder: {
    backgroundColor: GOLD + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT_GOLD,
  },
  statLabel: {
    fontSize: 13,
    color: LIGHT_GOLD,
    marginTop: 2,
  },
  profileDetails: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: LIGHT_GOLD,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: LIGHT_GOLD,
    lineHeight: 20,
  },
  addBioText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  bioEditContainer: {
    marginTop: 8,
  },
  bioInput: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioEditActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  bioCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
  },
  bioCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bioSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: GOLD,
  },
  bioSaveButtonDisabled: {
    backgroundColor: '#444',
  },
  bioSaveText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'transparent',
  },
  editProfileButtonText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: GOLD,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  followingButtonText: {
    color: LIGHT_GOLD,
  },
  actionButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: CARD,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: GOLD,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: '#666',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  activeTabLabel: {
    fontWeight: '700',
    color: GOLD,
  },
  postsGrid: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 1,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.78,
    backgroundColor: CARD,
    margin: 1,
  },
  heroItem: {
    width: width - 32,
    height: (width - 32) * 0.56,
    marginHorizontal: 16,
    marginTop: 16,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 4,
    padding: '2px 5px',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 20,
  },
  reportModal: {
    backgroundColor: CARD,
    width: width * 0.9,
    maxHeight: height * 0.7,
    borderRadius: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT_GOLD,
  },
  reportReasons: {
    flex: 1,
    padding: 20,
  },
  reportReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  reportEmoji: {
    fontSize: 20,
  },
  reportReasonText: {
    fontSize: 16,
    color: LIGHT_GOLD,
    flex: 1,
  },
  // Edit Profile Modal Styles
  editProfileModal: {
    backgroundColor: CARD,
    width: width * 0.9,
    maxHeight: height * 0.85,
    borderRadius: 20,
  },
  editProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  editProfileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT_GOLD,
  },
  editProfileContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: LIGHT_GOLD,
    marginBottom: 8,
  },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  editProfileActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#444',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  // Campaign Stats Styles
  campaignsContent: {
    padding: 20,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCampaigns: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCampaignsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT_GOLD,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyCampaignsText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LIGHT_GOLD,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    width: (width - 40) / 2 - 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: LIGHT_GOLD,
    marginTop: 8,
    marginBottom: 4,
  },
  campaignList: {
    marginBottom: 24,
  },
  campaignListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  campaignItem: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: '700',
    color: LIGHT_GOLD,
    marginBottom: 3,
  },
  campaignDetails: {
    fontSize: 12,
    color: '#666',
  },
  campaignScore: {
    backgroundColor: `${GOLD}18`,
    borderWidth: 1.5,
    borderColor: `${GOLD}40`,
    padding: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  campaignScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  badgesSection: {
    marginTop: 20,
  },
  badgesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeItem: {
    backgroundColor: `${GOLD}15`,
    borderWidth: 1.5,
    borderColor: `${GOLD}35`,
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
});
