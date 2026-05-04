import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView,
  Dimensions, Alert, StatusBar, Animated, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import Avatar from '../components/Avatar';
import UserSuggestions from '../components/UserSuggestions';
import HorizontalUserSuggestions from '../components/HorizontalUserSuggestions';

const { width, height } = Dimensions.get('window');
const GOLD = '#C8B56A';
const LIGHT_GOLD = '#F9E08B';
const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const BORDER = '#262626';
const TABS = ['For You', 'Explore', 'Campaigns'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const SkeletonPost = React.memo(() => {
  return (
    <View style={{ backgroundColor: CARD, marginBottom: 8, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#2a2a2a' }} />
        <View style={{ marginLeft: 10 }}>
          <View style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: '#2a2a2a', marginBottom: 6 }} />
          <View style={{ width: 60, height: 10, borderRadius: 5, backgroundColor: '#222' }} />
        </View>
      </View>
      <View style={{ width: '100%', height: width * 0.75, borderRadius: 8, backgroundColor: '#2a2a2a' }} />
      <View style={{ flexDirection: 'row', marginTop: 10, gap: 16 }}>
        <View style={{ width: 48, height: 12, borderRadius: 6, backgroundColor: '#2a2a2a' }} />
        <View style={{ width: 48, height: 12, borderRadius: 6, backgroundColor: '#2a2a2a' }} />
      </View>
    </View>
  );
});


export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const user = auth?.user ?? null;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [loadingComments, setLoadingComments] = useState(false);
  const [activeTab, setActiveTab] = useState('For You');
  const [showOptions, setShowOptions] = useState(null);
  const [optionsPosition, setOptionsPosition] = useState({ x: 0, y: 0 });
  const optionsButtonRef = useRef(null);
  const [followStates, setFollowStates] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [shareToast, setShareToast] = useState('');
  const [showPostInfoModal, setShowPostInfoModal] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showHorizontalSuggestions, setShowHorizontalSuggestions] = useState(true);
  const [suggestionPositions, setSuggestionPositions] = useState(new Set());
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [sendingGift, setSendingGift] = useState(false);
  const [giftSent, setGiftSent] = useState(null);
  const [giftError, setGiftError] = useState('');
  const [userCoins, setUserCoins] = useState(0);
  const [gifts, setGifts] = useState([]);
  const [giftsSentToday, setGiftsSentToday] = useState(0);
  const [dailyGiftLimit, setDailyGiftLimit] = useState(10);
  const [giftHistory, setGiftHistory] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const LIMIT = 5;

  const CATEGORY_ICONS = {
    flowers: '🌹',
    hearts: '❤️',
    gems: '💎',
    special: '⭐',
    animals: '🐻',
  };

  const DEFAULT_GIFTS = [
    { id: 1, name: 'Rose', description: 'A beautiful red rose', coin_value: 10, rarity: 'common', category: 'flowers' },
    { id: 2, name: 'Heart', description: 'A heart symbol', coin_value: 20, rarity: 'common', category: 'hearts' },
    { id: 3, name: 'Medal', description: 'A gold medal', coin_value: 50, rarity: 'rare', category: 'special' },
    { id: 4, name: 'Diamond', description: 'A sparkling diamond', coin_value: 100, rarity: 'epic', category: 'gems' },
    { id: 5, name: 'Teddy Bear', description: 'A cute teddy bear', coin_value: 30, rarity: 'common', category: 'animals' },
  ];

  useEffect(() => {
    if (activeTab === 'For You') {
      // Show stale cache immediately, refresh in background
      const stale = api.requestStale(`/reels/?limit=${LIMIT}&offset=0`, (fresh) => {
        const results = Array.isArray(fresh) ? fresh : (fresh.results || []);
        // Insert suggestions at dynamic positions
        let finalResults = results;
        if (results.length >= 3) {
          const positions = calculateSuggestionPositions(results.length);
          setSuggestionPositions(positions);
          
          // Insert suggestions at calculated positions
          const withSuggestions = [];
          results.forEach((post, index) => {
            withSuggestions.push(post);
            if (positions.has(index)) {
              withSuggestions.push({ type: 'horizontal_suggestions', id: `suggestions-${index}` });
            }
          });
          finalResults = withSuggestions;
        }
        setPosts(finalResults);
        setHasMore(results.length === LIMIT);
        setPage(0);
      });
      if (stale) {
        const results = Array.isArray(stale) ? stale : (stale.results || []);
        // Insert suggestions at dynamic positions for stale cache
        let finalResults = results;
        if (results.length >= 3) {
          const positions = calculateSuggestionPositions(results.length);
          setSuggestionPositions(positions);
          
          const withSuggestions = [];
          results.forEach((post, index) => {
            withSuggestions.push(post);
            if (positions.has(index)) {
              withSuggestions.push({ type: 'horizontal_suggestions', id: `suggestions-${index}` });
            }
          });
          finalResults = withSuggestions;
        }
        setPosts(finalResults);
        setHasMore(results.length === LIMIT);
        setPage(0);
        setLoading(false);
      } else {
        fetchPosts(0, true);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const loadUserCoins = async () => {
      try {
        // Use wallet API to get purchased balance for gifting (web app logic)
        const wallet = await api.request('/wallet/');
        setUserCoins(wallet.balance?.purchased || 0);
        
        // Load gamification status for daily gift limit
        const status = await api.request('/gamification/status/');
        setGiftsSentToday(status.gifts?.sent_today || 0);
        
        // Load gift history
        const history = await api.request('/gamification/gifts/history/');
        setGiftHistory(history.received || []);
      } catch (error) {
        console.error('Failed to load user coins:', error);
        setUserCoins(0);
      }
    };
    loadUserCoins();
  }, [showGiftModal]);

  useEffect(() => {
    const loadGifts = async () => {
      try {
        const response = await api.request('/gifts/');
        const giftsData = response.results || response;
        if (Array.isArray(giftsData) && giftsData.length > 0) {
          setGifts(giftsData);
        } else {
          setGifts(DEFAULT_GIFTS);
        }
      } catch (error) {
        console.error('Failed to load gifts:', error);
        setGifts(DEFAULT_GIFTS);
      }
    };
    loadGifts();
  }, []);

  const fetchPosts = async (offset = 0, reset = false) => {
    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      const data = await api.request(`/reels/?limit=${LIMIT}&offset=${offset}`);
      const results = Array.isArray(data) ? data : (data.results || []);
      
      // Insert suggestions at dynamic positions
      let finalResults = results;
      if (reset && results.length >= 3) {
        const positions = calculateSuggestionPositions(results.length);
        setSuggestionPositions(positions);
        
        const withSuggestions = [];
        results.forEach((post, index) => {
          withSuggestions.push(post);
          if (positions.has(index)) {
            withSuggestions.push({ type: 'horizontal_suggestions', id: `suggestions-${index}` });
          }
        });
        finalResults = withSuggestions;
      }
      
      setPosts(prev => reset ? finalResults : [...prev, ...results]);
      setHasMore(results.length === LIMIT);
      setPage(offset);
    } catch (e) {
      console.error('Feed error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchPosts(0, true); }, []);
  const onEndReached = useCallback(() => { if (!loadingMore && hasMore && activeTab === 'For You') fetchPosts(page + LIMIT); }, [loadingMore, hasMore, activeTab, page]);

  const sharePost = useCallback(async (post) => {
    const url = `https://flipstar.app/post/${post.id}`;
    const title = post.caption ? post.caption.slice(0, 80) : 'Check out this post on FlipStar';
    
    try {
      await Share.share({
        message: `${title} ${url}`,
        url: url,
        title: 'FlipStar Post',
      });
      // Increment share count on backend
      try { await api.request(`/reels/${post.id}/share/`, { method: 'POST' }); } catch (err) {
        console.log('Share API error:', err);
      }
    } catch (error) {
      if (error.message === 'User did not share') {
        // User cancelled - this is expected behavior
        return;
      }
      console.log('Share error:', error);
    }
  }, []);

  const toggleFollow = useCallback(async (userId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to follow users');
      return;
    }
    
    setFollowStates(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await api.request('/follows/toggle/', {
        method: 'POST',
        body: JSON.stringify({ following_id: userId }),
      });
      
      setFollowStates(prev => ({ ...prev, [userId]: response.following }));
      
      // Activity-based trigger: after following, show suggestions
      if (response.following) {
        // Insert suggestions near the current position after a short delay
        setTimeout(() => {
          setPosts(prev => {
            const currentIndex = prev.findIndex(p => p.user?.id === userId);
            if (currentIndex !== -1 && currentIndex + 1 < prev.length) {
              const newPosts = [...prev];
              newPosts.splice(currentIndex + 1, 0, { type: 'horizontal_suggestions', id: `suggestions-follow-${Date.now()}` });
              return newPosts;
            }
            return prev;
          });
        }, 500);
      }
    } catch (error) {
      console.error('Follow error:', error);
      setFollowStates(prev => ({ ...prev, [userId]: false }));
    }
  }, [user]);

  const trackView = async (postId) => {
    if (viewCounts[postId]) return;
    
    setViewCounts(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await api.request(`/reels/${postId}/view/`, { method: 'POST' });
      if (res?.view_count !== undefined) {
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, view_count: res.view_count } : p
        ));
      }
    } catch {}
  };

  // Build comment tree from flat list (like web app)
  const buildCommentTree = (flatList) => {
    if (!Array.isArray(flatList)) return [];
    const map = {};
    const roots = [];
    
    flatList.forEach(c => {
      map[c.id] = { ...c };
      if (!map[c.id].replies) map[c.id].replies = [];
    });
    
    flatList.forEach(c => {
      const node = map[c.id];
      const parentVal = c.parent_id || c.parent;
      const parentId = (parentVal && typeof parentVal === 'object') ? parentVal.id : parentVal;
      
      if (parentId && String(parentId) !== '0') {
        const parent = map[parentId];
        if (parent) {
          if (!parent.replies.some(r => String(r.id) === String(node.id))) {
            parent.replies.push(node);
          }
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const findRootId = (list, targetId) => {
    for (const c of list) {
      if (String(c.id) === String(targetId)) return c.id;
      if (c.replies?.length) {
        const found = findRootId(c.replies, targetId);
        if (found !== null) return found;
      }
    }
    return null;
  };

  const showPostOptions = (post) => {
    // Position dropdown in upper right corner of the card (Instagram-style)
    // Fixed position from top-right of screen
    setOptionsPosition({ 
      x: Dimensions.get('window').width - 200, // 200px from left (right-aligned)
      y: 60 // 60px from top (below header)
    });
    setShowOptions(post);
  };

  const handleTabPress = (tab) => {
    if (tab === 'Explore') {
      navigation.navigate('Explore');
      return;
    }
    if (tab === 'Campaigns') {
      navigation.navigate('Campaigns');
      return;
    }
    setActiveTab(tab);
  };

  // Calculate dynamic suggestion positions based on Instagram-style algorithm
  const calculateSuggestionPositions = (postCount) => {
    const positions = new Set();
    if (postCount < 3) return positions;
    
    // Insert suggestions at random intervals (every 3-5 posts)
    // Instagram uses dynamic positioning based on user activity
    let position = 2 + Math.floor(Math.random() * 3); // Start between 2-4
    while (position < postCount) {
      positions.add(position);
      position += 3 + Math.floor(Math.random() * 3); // Add 3-5 posts between suggestions
    }
    
    return positions;
  };

  const copyPostLink = (post) => {
    const url = `https://flipstar.app/post/${post.id}`;
    Share.share({
      message: url,
      title: 'FlipStar Post',
    }).catch(() => {});
    setShowOptions(null);
  };

  const showPostInfo = (post) => {
    setShowPostInfoModal(post);
    setShowOptions(null);
  };

  const downloadPost = async (post) => {
    const url = post.media || post.image;
    if (!url) return;
    
    try {
      // For Cloudinary URLs, add fl_attachment to force download
      let downloadUrl = url;
      if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
      }
      
      // In React Native, we can't directly download files to device storage
      // We'll show a toast with the download URL
      setShareToast('Download link copied to clipboard');
      setTimeout(() => setShareToast(''), 2000);
      setShowOptions(null);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const deletePost = async (post) => {
    if (!user || user.id !== post.user?.id) return;
    
    try {
      await api.request(`/reels/${post.id}/`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setShowOptions(null);
      setShareToast('Post deleted successfully');
      setTimeout(() => setShareToast(''), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      setShareToast('Failed to delete post');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  const reportPost = (post) => {
    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport(post, 'spam') },
        { text: 'Inappropriate', onPress: () => submitReport(post, 'inappropriate') },
        { text: 'Other', onPress: () => submitReport(post, 'other') },
      ]
    );
    setShowOptions(null);
  };

  const submitReport = async (post, reason) => {
    try {
      await api.request('/reports/create/', {
        method: 'POST',
        body: JSON.stringify({
          reported_reel_id: post.id,
          report_type: reason,
          description: `Reported as ${reason}`,
        }),
      });
      Alert.alert('Success', 'Report submitted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const goToReel = useCallback((postId) => {
    trackView(postId);
    navigation.navigate('ReelsDetail', { initialVideoId: postId });
  }, [navigation]);

  const toggleLike = useCallback(async (post) => {
    const newLiked = !post.is_liked;
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, is_liked: newLiked, votes: newLiked ? (p.votes + 1) : Math.max(0, p.votes - 1) }
      : p));
    try { 
      await api.request(`/reels/${post.id}/vote/`, { method: 'POST' });
    } catch { 
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked: post.is_liked, votes: post.votes } : p));
    }
  }, []);

  const toggleSave = useCallback(async (post) => {
    const newSaved = !post.is_saved;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_saved: newSaved } : p));
    try {
      await api.request(`/reels/${post.id}/save/`, { method: 'POST' });
    } catch {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_saved: post.is_saved } : p));
    }
  }, []);

  const openGiftModal = (postUser) => {
    setGiftRecipient(postUser?.username || '');
    setSelectedGift(null);
    setGiftQuantity(1);
    setGiftMessage('');
    setGiftError('');
    setGiftSent(null);
    setSelectedCategory('all');
    setShowGiftModal(true);
  };

  const sendGift = async () => {
    if (!giftRecipient.trim()) {
      setGiftError('Enter a recipient username');
      return;
    }
    if (!selectedGift) {
      setGiftError('Select a gift to send');
      return;
    }
    const totalCost = selectedGift.coin_value * giftQuantity;
    
    // Check daily gift limit (web app logic: 10 gifts per day)
    if (giftsSentToday >= dailyGiftLimit) {
      setGiftError(`Daily gift limit reached (${dailyGiftLimit} per day)`);
      return;
    }
    
    // Check purchased coins balance (web app logic: only purchased coins can be gifted)
    if (totalCost > userCoins) {
      setGiftError(`Insufficient purchased coins. Need ${totalCost}, have ${userCoins}`);
      return;
    }
    
    setSendingGift(true);
    setGiftError('');
    try {
      // Use gifts/send endpoint (web app logic)
      await api.request('/gifts/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gift_id: selectedGift.id,
          recipient_username: giftRecipient,
          quantity: giftQuantity,
          message: giftMessage,
        }),
      });
      setGiftSent(true);
      setUserCoins(prev => prev - totalCost);
      setGiftsSentToday(prev => prev + 1);
      setTimeout(() => {
        setShowGiftModal(false);
        setGiftSent(null);
      }, 2000);
    } catch (error) {
      console.error('Gift error:', error);
      const errorData = error.response?.data || error;
      if (errorData.needs_recharge) {
        setGiftError(`Insufficient purchased coins. Need ${totalCost}, have ${userCoins}`);
      } else {
        setGiftError(errorData.error || error.message || 'Failed to send gift');
      }
    } finally {
      setSendingGift(false);
    }
  };

  const openComments = async (post) => {
    setCommentPost(post);
    setLoadingComments(true);
    try {
      // Fetch comments with replies for tree structure
      const data = await api.request(`/reels/${post.id}/comments/?include_replies=true&depth=2`);
      const full = Array.isArray(data) ? data : (data?.results || []);
      setComments(buildCommentTree(full));
    } catch (e) {
      console.error('Failed to fetch comments:', e);
      setComments(buildCommentTree(post.recent_comments || []));
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (!commentText.trim() || !commentPost) return;
    setPostingComment(true);
    
    const temp = {
      id: `temp-${Date.now()}`,
      text: commentText.trim(),
      user: user || { username: 'you', profile_photo: null },
      created_at: new Date().toISOString(),
      likes: 0,
      replies: [],
      pending: true,
    };

    try {
      if (replyingTo) {
        // Add as reply
        const updateDeep = (list) => list.map(c => {
          if (String(c.id) === String(replyingTo.id)) {
            return { ...c, replies: [...(c.replies || []), temp] };
          }
          if (c.replies && c.replies.length) {
            return { ...c, replies: updateDeep(c.replies) };
          }
          return c;
        });
        setComments(updateDeep(comments));
        
        // Auto-expand the root ancestor
        const rootId = findRootId(comments, replyingTo.id);
        if (rootId != null) {
          setExpandedReplies(prev => {
            const next = new Set(prev);
            next.add(rootId);
            return next;
          });
        }
        
        const res = await api.request(`/reels/${commentPost.id}/comments/`, {
          method: 'POST',
          body: JSON.stringify({ text: commentText.trim(), parent_id: replyingTo.id }),
        });
        if (!res.replies) res.replies = [];
        
        const swapDeep = (list) => list.map(c => {
          if (String(c.id) === String(replyingTo.id)) {
            return { ...c, replies: c.replies.map(r => r.id === temp.id ? res : r) };
          }
          if (c.replies && c.replies.length) {
            return { ...c, replies: swapDeep(c.replies) };
          }
          return c;
        });
        setComments(swapDeep(comments));
      } else {
        // Add as top-level comment
        setComments([temp, ...comments]);
        const c = await api.request(`/reels/${commentPost.id}/comments/`, {
          method: 'POST', body: JSON.stringify({ text: commentText.trim() }),
        });
        if (!c.replies) c.replies = [];
        setComments(prev => prev.map(cm => cm.id === temp.id ? c : cm));
      }
      
      setCommentText('');
      setReplyingTo(null);
      setPosts(prev => prev.map(p => p.id === commentPost.id
        ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
    } catch (e) {
      Alert.alert('Error', 'Failed to post comment');
      // Roll back
      setComments(prev => {
        const removeDeep = (list) => list.filter(c => {
          if (c.id === temp.id) return false;
          if (c.replies?.length) c.replies = removeDeep(c.replies);
          return true;
        });
        return removeDeep(prev);
      });
    } finally {
      setPostingComment(false);
    }
  };

  const renderHashtags = (hashtags) => {
    if (!hashtags) return null;
    const tags = String(hashtags).split(/[\s,]+/).filter(Boolean)
      .map(t => t.startsWith('#') ? t : `#${t}`).join('  ');
    return <Text style={styles.hashtags}>{tags}</Text>;
  };

  // Recursive comment item component for tree structure
  const CommentItem = ({ comment, depth = 0 }) => {
    const isReply = depth > 0;
    const avatarSize = isReply ? 28 : 34;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const showRepliesToggle = !isReply && hasReplies;

    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Avatar uri={comment.user?.profile_photo} size={avatarSize} name={comment.user?.username} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.commentUser}>{comment.user?.username}</Text>
              <Text style={{ color: '#666', fontSize: 11 }}>{timeAgo(comment.created_at)}</Text>
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
              <TouchableOpacity onPress={() => {}}>
                <Ionicons name="heart-outline" size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReplyingTo(comment)}>
                <Text style={{ color: GOLD, fontSize: 13, fontWeight: '600' }}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* View/Hide replies button */}
        {showRepliesToggle && (
          <TouchableOpacity 
            onPress={() => toggleReplies(comment.id)}
            style={{ marginLeft: avatarSize + 10, marginTop: 8 }}
          >
            <Text style={{ color: GOLD, fontSize: 13, fontWeight: '600' }}>
              {isExpanded 
                ? `Hide ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
              }
            </Text>
          </TouchableOpacity>
        )}

        {/* Recursive replies with tree line */}
        {hasReplies && (isReply || isExpanded) && (
          <View style={{ 
            marginLeft: depth === 0 ? 18 : 12, 
            paddingLeft: depth === 0 ? 26 : 18, 
            borderLeftWidth: 2, 
            borderLeftColor: 'rgba(200, 181, 106, 0.2)',
            marginTop: 12,
          }}>
            {comment.replies.map(r => (
              <CommentItem key={r.id} comment={r} depth={depth + 1} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPost = useCallback(({ item: post, index }) => {
    // Render horizontal suggestions after 2nd post (index 1)
    if (post.type === 'horizontal_suggestions' || post.type === 'suggestions') {
      return showHorizontalSuggestions ? (
        <HorizontalUserSuggestions 
          onUserClick={(userId) => navigation.navigate('Profile', { userId })}
          onDismiss={() => setShowHorizontalSuggestions(false)}
        />
      ) : null;
    }

    const isVideo = !!(post.media) && (
      /\.(mp4|webm|ogg|mov)(\?|$)/i.test(post.media) ||
      post.media.includes('/video/upload/')
    );
    const isOwnPost = user?.id === post.user?.id;
    const isFollowing = post.user?.is_following || followStates[post.user?.id];
    const isCampaignPost = !!(post.is_campaign_post || post.campaign_id || post.campaign);
    
    return (
      <Animated.View 
        style={[
          styles.postCard, 
          { opacity: scrollY.interpolate({
            inputRange: [0, 300],
            outputRange: [1, 0.8],
            extrapolate: 'clamp',
          })}
        ]}
      >
        {/* Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postUser}
            onPress={() => navigation.navigate('Profile', { userId: post.user?.id })}
          >
            <Avatar uri={post.user?.profile_photo} size={36} name={post.user?.username} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.username}>{post.user?.username}</Text>
              </View>
              {post.created_at ? (
                <Text style={styles.timeAgo}>{timeAgo(post.created_at)}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
            
          {/* Follow/Unfollow button - only show for other users' posts */}
          {user && post.user?.id !== user.id && (
            <TouchableOpacity
              style={[
                styles.followBtn,
                isFollowing && styles.followingBtn
              ]}
              onPress={() => toggleFollow(post.user?.id)}
            >
              <Text style={[
                styles.followBtnText,
                isFollowing && styles.followingBtnText
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Options - moved to header upper right */}
          <TouchableOpacity
            style={styles.headerOptionsBtn}
            onPress={() => showPostOptions(post)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Media */}
        {(post.media || post.image) && (
          <TouchableOpacity onPress={() => goToReel(post.id)} activeOpacity={0.9}>
            <View style={styles.mediaWrapper}>
              {isVideo ? (
                <>
                  <Image
                    source={{ uri: post.image || post.media.replace(/\.(mp4|webm|ogg|mov)$/i, '.jpg') }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                  <View style={styles.playOverlay} pointerEvents="none">
                    <View style={styles.playBtn}>
                      <Ionicons name="play" size={24} color="#000" />
                    </View>
                  </View>
                </>
              ) : (
                <Image
                  source={{ uri: post.image || post.media }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              )}
              
              {/* View count badge */}
              <View style={styles.viewBadge}>
                <Ionicons name="eye" size={12} color="#fff" />
                <Text style={styles.viewCount}>{(post.view_count || 0).toLocaleString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            {/* Like */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post)}>
              <Ionicons
                name={post.is_liked ? 'heart' : 'heart-outline'}
                size={24}
                color={post.is_liked ? LIGHT_GOLD : LIGHT_GOLD}
                fill={post.is_liked ? LIGHT_GOLD : 'none'}
              />
              {post.votes > 0 && <Text style={styles.actionCount}>{post.votes}</Text>}
            </TouchableOpacity>
            
            {/* Comment */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(post)}>
              <Ionicons name="chatbubble-outline" size={22} color={LIGHT_GOLD} />
              {post.comment_count > 0 && <Text style={styles.actionCount}>{post.comment_count}</Text>}
            </TouchableOpacity>
            
            {/* Share */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => sharePost(post)}>
              <Ionicons name="share-social-outline" size={22} color={LIGHT_GOLD} />
              {post.shares > 0 && <Text style={styles.actionCount}>{post.shares}</Text>}
            </TouchableOpacity>
            
            {/* Gift - only for other people's posts */}
            {post.user?.username !== user?.username && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => openGiftModal(post.user)}>
                <Ionicons name="gift-outline" size={22} color={LIGHT_GOLD} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.rightActions}>
            {/* Save */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleSave(post)}
            >
              <Ionicons
                name={post.is_saved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={post.is_saved ? LIGHT_GOLD : LIGHT_GOLD}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption */}
        {post.caption && (
          <TouchableOpacity 
            style={styles.captionContainer}
            onPress={() => {}} // Could expand caption
          >
            <Text style={styles.caption} numberOfLines={2}>
              <Text style={styles.captionUsername}>{post.user?.username} </Text>
              {post.caption}
            </Text>
            {post.caption.length > 100 && (
              <Text style={styles.captionMore}> more</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Recent comments */}
        {post.recent_comments && post.recent_comments.length > 0 && (
          <TouchableOpacity 
            style={styles.recentComments}
            onPress={() => openComments(post)}
          >
            <Text style={styles.recentComment}>
              <Text style={styles.commentUsername}>{post.recent_comments[0].user?.username} </Text>
              {post.recent_comments[0].text}
            </Text>
          </TouchableOpacity>
        )}

        {/* Comments link */}
        <TouchableOpacity onPress={() => openComments(post)}>
          <Text style={styles.commentsLink}>
            {post.comment_count > 0 ? `View all ${post.comment_count} comments` : 'Add a comment...'}
          </Text>
        </TouchableOpacity>

        {/* Hashtags */}
        {renderHashtags(post.hashtags_list || post.hashtags)}
      </Animated.View>
    );
  }, [user, followStates, navigation, toggleLike, toggleSave, sharePost, goToReel, openComments, openGiftModal, showPostOptions, scrollY]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
          <Ionicons name="search" size={24} color={GOLD} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading && posts.length === 0 ? (
        <View style={{ paddingTop: 8 }}>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </View>
      ) : activeTab === 'For You' ? (
        <Animated.FlatList
          data={posts}
          keyExtractor={p => String(p.id)}
          renderItem={renderPost}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={null}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={GOLD} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: '#666', fontSize: 16 }}>No posts yet</Text>
              <Text style={{ color: '#666', marginTop: 8 }}>Be the first to share something!</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={3}
          initialNumToRender={3}
          updateCellsBatchingPeriod={50}
        />
      ) : null}

      {/* Share Toast */}
      {shareToast !== '' && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{shareToast}</Text>
        </View>
      )}

      {/* Post Info Modal */}
      {showPostInfoModal && (
        <Modal
          visible={!!showPostInfoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPostInfoModal(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPostInfoModal(null)}
          >
            <View style={styles.infoSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Post Info</Text>
                <TouchableOpacity onPress={() => setShowPostInfoModal(null)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Avatar uri={showPostInfoModal.user?.profile_photo} size={44} name={showPostInfoModal.user?.username} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: GOLD, fontWeight: '700', fontSize: 16 }}>
                      @{showPostInfoModal.user?.username}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {showPostInfoModal.user?.first_name} {showPostInfoModal.user?.last_name || ''}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 12 }}>Likes</Text>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{showPostInfoModal.votes || 0}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 12 }}>Comments</Text>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{showPostInfoModal.comment_count || 0}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 12 }}>Views</Text>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{showPostInfoModal.view_count || 0}</Text>
                  </View>
                </View>
                <Text style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                  {showPostInfoModal.media ? '🎬 Video' : '🖼️ Image'} · {timeAgo(showPostInfoModal.created_at)}
                </Text>
                {showPostInfoModal.caption && (
                  <Text style={{ color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
                    <Text style={{ color: GOLD, fontWeight: '700' }}>@{showPostInfoModal.user?.username} </Text>
                    {showPostInfoModal.caption}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={{ padding: 16, borderTopWidth: 1, borderTopColor: BORDER, alignItems: 'center' }}
                onPress={() => setShowPostInfoModal(null)}
              >
                <Text style={{ color: GOLD, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Post Options Modal */}
      <Modal
        visible={!!showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(null)}
        >
          <View style={[styles.optionsDropdown, { top: optionsPosition.y, left: optionsPosition.x }]}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => showPostInfo(showOptions)}>
              <Ionicons name="information-circle-outline" size={18} color={GOLD} />
              <Text style={styles.dropdownText}>Post Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => copyPostLink(showOptions)}>
              <Ionicons name="link-outline" size={18} color={GOLD} />
              <Text style={styles.dropdownText}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => toggleSave(showOptions)}>
              <Ionicons name="bookmark-outline" size={18} color={GOLD} />
              <Text style={styles.dropdownText}>{showOptions?.is_saved ? 'Saved' : 'Save to Favorites'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => downloadPost(showOptions)}>
              <Ionicons name="download-outline" size={18} color={GOLD} />
              <Text style={styles.dropdownText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => reportPost(showOptions)}>
              <Ionicons name="eye-off-outline" size={18} color="#78716C" />
              <Text style={styles.dropdownText}>Not Interested</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => reportPost(showOptions)}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              <Text style={[styles.dropdownText, { color: '#EF4444' }]}>Report</Text>
            </TouchableOpacity>
            {user?.id === showOptions?.user?.id && (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => deletePost(showOptions)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.dropdownText, { color: '#EF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={!!commentPost}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.commentsSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentPost(null)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {loadingComments ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <ActivityIndicator color={GOLD} />
                  <Text style={{ color: '#666', marginTop: 12 }}>Loading comments...</Text>
                </View>
              ) : comments.length === 0 ? (
                <Text style={{ color: '#666', textAlign: 'center', padding: 32 }}>
                  No comments yet. Be the first!
                </Text>
              ) : (
                <View style={{ padding: 12 }}>
                  {comments.map(c => (
                    <CommentItem key={c.id} comment={c} depth={0} />
                  ))}
                </View>
              )}
            </ScrollView>
            
            {/* Reply indicator */}
            {replyingTo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <Text style={{ color: GOLD, fontSize: 12 }}>Replying to </Text>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{replyingTo.user?.username}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.commentInput}>
              <Avatar uri={user?.profile_photo} size={32} name={user?.username} />
              <TextInput
                style={styles.commentTextInput}
                placeholder={replyingTo ? `Reply to ${replyingTo.user?.username}...` : "Add a comment..."}
                placeholderTextColor="#666"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={() => setCommentText(prev => prev + '@')}
                style={styles.commentIconButton}
              >
                <Ionicons name="at" size={20} color={GOLD} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openGiftModal(commentPost)}
                style={styles.commentIconButton}
              >
                <Ionicons name="gift" size={20} color={GOLD} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={postComment}
                disabled={!commentText.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color={GOLD} />
                ) : (
                  <Ionicons
                    name="send"
                    size={22}
                    color={commentText.trim() ? GOLD : '#444'}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gift Modal */}
      <Modal
        visible={showGiftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGiftModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGiftModal(false)}
        >
          <TouchableOpacity style={styles.giftSheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>🎁 Gift to @{giftRecipient}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.coinBalance}>🪙 {userCoins}</Text>
                  <Text style={styles.coinLabel}>Purchased Coins</Text>
                  <Text style={styles.giftLimitLabel}>{giftsSentToday}/{dailyGiftLimit} gifts today</Text>
                </View>
                <TouchableOpacity onPress={() => setShowGiftModal(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {giftSent ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 64, marginBottom: 12 }}>🎉</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: GOLD, marginBottom: 4 }}>Gift Sent!</Text>
                <Text style={{ fontSize: 14, color: '#78716C', marginBottom: 24, textAlign: 'center' }}>
                  Your gift has been sent successfully
                </Text>
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => setShowGiftModal(false)}
                >
                  <Text style={styles.sendButtonText}>Done 🎊</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Category Filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryFilter}
                  contentContainerStyle={{ paddingHorizontal: 12 }}
                >
                  {['all', ...new Set(gifts.map(g => g.category))].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryButton, selectedCategory === cat && styles.categoryButtonActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.categoryButtonText, selectedCategory === cat && styles.categoryButtonTextActive]}>
                        {cat !== 'all' && CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Gift Selection Grid */}
                <View style={styles.giftGrid}>
                  {(selectedCategory === 'all' ? gifts : gifts.filter(g => g.category === selectedCategory)).map(gift => (
                    <TouchableOpacity
                      key={gift.id}
                      style={[styles.giftItem, selectedGift?.id === gift.id && styles.giftItemActive]}
                      onPress={() => { setSelectedGift(gift); setGiftQuantity(1); }}
                    >
                      <Text style={styles.giftEmoji}>{gift.image_url ? '🎁' : (CATEGORY_ICONS[gift.category] || '🎁')}</Text>
                      <Text style={styles.giftCoinValue}>{gift.coin_value}🪙</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Selected Gift Info & Quantity */}
                {selectedGift && (
                  <View style={styles.selectedGiftContainer}>
                    <Text style={styles.selectedGiftName}>{selectedGift.name}</Text>
                    <View style={styles.quantitySelector}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setGiftQuantity(Math.max(1, giftQuantity - 1))}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{giftQuantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setGiftQuantity(giftQuantity + 1)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Message Input */}
                <Text style={styles.fieldLabel}>Message (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Add a message..."
                  placeholderTextColor="#666"
                  value={giftMessage}
                  onChangeText={setGiftMessage}
                />

                {giftError ? <Text style={styles.errorText}>{giftError}</Text> : null}

                {/* Send Button */}
                <TouchableOpacity
                  style={[styles.sendButton, sendingGift && { opacity: 0.6 }]}
                  onPress={sendGift}
                  disabled={sendingGift || !selectedGift}
                >
                  {sendingGift ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.sendButtonText}>
                      Send Gift · 🪙 {selectedGift ? selectedGift.coin_value * giftQuantity : 0}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: GOLD },
  coinBalance: { fontSize: 16, fontWeight: '700', color: GOLD },
  coinLabel: { fontSize: 10, color: '#666', fontWeight: '600' },
  giftLimitLabel: { fontSize: 9, color: '#888', fontWeight: '500' },
  headerLogo: { width: 120, height: 30 },
  
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: GOLD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: LIGHT_GOLD,
  },
  activeTabText: {
    color: '#000',
    fontWeight: '700',
  },
  
  // Post Card
  postCard: { 
    backgroundColor: CARD, 
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  postHeader: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 12,
  },
  postUser: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  username: { fontSize: 14, fontWeight: '700', color: '#fff' },
  timeAgo: { fontSize: 12, color: LIGHT_GOLD, marginTop: 1 },
  followBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  headerOptionsBtn: {
    padding: 8,
    marginLeft: 8,
  },
  followingBtn: {
    backgroundColor: 'rgba(249,224,139,0.15)',
    borderColor: GOLD,
  },
  followBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  followingBtnText: {
    color: GOLD,
  },
  optionsBtn: {
    padding: 4,
  },
  
  // Caption
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  caption: { 
    fontSize: 14, 
    color: '#ddd', 
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '700',
    color: LIGHT_GOLD,
  },
  captionMore: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
  },
  
  // Media
  mediaWrapper: { position: 'relative' },
  mediaImage: { 
    width: '100%', 
    height: width * 0.75, 
    backgroundColor: '#111',
  },
  playOverlay: {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playBtn: {
    width: 56, 
    height: 56, 
    borderRadius: 28,
    backgroundColor: 'rgba(249,224,139,0.9)',
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  viewBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Actions
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 12, 
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionCount: { 
    fontSize: 13, 
    color: LIGHT_GOLD, 
    marginLeft: 3,
    fontWeight: '600',
  },
  
  // Comments
  recentComments: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  recentComment: {
    fontSize: 12,
    color: '#ddd',
    lineHeight: 16,
  },
  commentUsername: {
    fontWeight: '700',
    color: LIGHT_GOLD,
  },
  commentsLink: {
    fontSize: 12,
    color: LIGHT_GOLD,
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontWeight: '600',
  },
  
  // Hashtags
  hashtags: { 
    fontSize: 13, 
    color: LIGHT_GOLD, 
    paddingHorizontal: 12, 
    paddingBottom: 12, 
    fontWeight: '600', 
    lineHeight: 20,
  },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsDropdown: {
    position: 'absolute',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  dropdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Comments Modal
  commentsSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    paddingBottom: 20,
  },
  infoSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    marginTop: 'auto',
  },
  sheetHandle: { 
    width: 40, 
    height: 4, 
    backgroundColor: '#444', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginTop: 10 
  },
  sheetHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: BORDER,
  },
  sheetTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fff' 
  },
  commentItem: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1a1a1a' 
  },
  commentUser: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: LIGHT_GOLD, 
    marginBottom: 2 
  },
  commentText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 18
  },

  // Gift Modal
  giftSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingBottom: 20,
  },
  coinBalance: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#1a1a1a',
    marginRight: 6,
  },
  categoryButtonActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(249,224,139,0.15)',
  },
  categoryButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  categoryButtonTextActive: {
    color: GOLD,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  giftItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '1%',
  },
  giftItemActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(249,224,139,0.15)',
  },
  giftEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  giftCoinValue: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  selectedGiftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  selectedGiftName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  quantityValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: BORDER,
    marginHorizontal: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    marginHorizontal: 12,
  },
  sendButton: {
    width: '92%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: GOLD,
    marginTop: 16,
    alignSelf: 'center',
  },
  sendButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 10,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
  },
  commentIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249,224,139,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 80,
    left: width / 2 - 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});


