import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  Dimensions, ActivityIndicator, StatusBar, TextInput, Modal,
  ScrollView, Alert, Animated, RefreshControl, Share, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
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

// Helper to shuffle array for randomized feed
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// CaptionWithLessMore component for truncating long captions
const CaptionWithLessMore = React.memo(({ caption, maxLength = 100 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!caption || caption.length <= maxLength) {
    return <Text style={styles.caption}>{caption}</Text>;
  }
  
  return (
    <View>
      <Text style={styles.caption}>
        {isExpanded ? caption : caption.slice(0, maxLength) + '...'}
        <Text
          style={styles.moreLessBtn}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? ' less' : ' more'}
        </Text>
      </Text>
    </View>
  );
});

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const Avatar = React.memo(({ uri, size = 36, name = '', showBorder = false }) => {
  const [err, setErr] = useState(false);
  const safeName = name || '?';
  if (uri && !err) {
    return (
      <Image
        source={{ uri }}
        style={{ 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          borderWidth: showBorder ? 2 : 0,
          borderColor: GOLD
        }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={{ 
      width: size, 
      height: size, 
      borderRadius: size / 2, 
      backgroundColor: GOLD, 
      justifyContent: 'center', 
      alignItems: 'center',
      borderWidth: showBorder ? 2 : 0,
      borderColor: '#fff'
    }}>
      <Text style={{ color: '#000', fontWeight: '700', fontSize: size * 0.4 }}>
        {safeName[0].toUpperCase()}
      </Text>
    </View>
  );
});

// Enhanced ReelItem component matching website's TikTok-style layout
const ReelItem = React.memo(function ReelItem({ 
  item, 
  isActive, 
  onLike, 
  onComment, 
  onSave, 
  onFollow,
  onShare,
  onReport,
  onShowProfile,
  onNavigate,
  user,
  index,
  videos,
  setVideos 
}) {
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(null); // { videoId, x, y }
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [followStates, setFollowStates] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const longPressTimer = useRef(null);
  
  const lastTapRef = useRef(0);
  const DOUBLE_TAP_WINDOW = 280;

  const [videoPaused, setVideoPaused] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoOrientation, setVideoOrientation] = useState('portrait');

  // Treat all reel media as video (reels endpoint only returns video content)
  const isVideo = !!(item.media);

  const videoUri = item.media
    ? (item.media.startsWith('http') ? item.media : `http://localhost:8000${item.media}`)
    : null;

  const webViewRef = useRef(null);

  useEffect(() => {
    if (!webViewRef.current || !isVideo) return;
    const js = isActive && !videoPaused
      ? `var v=document.getElementById('v'); if(v){v.play();} true;`
      : `var v=document.getElementById('v'); if(v){v.pause();} true;`;
    webViewRef.current.injectJavaScript(js);
  }, [isActive, videoPaused, isVideo]);

  useEffect(() => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(`var v=document.getElementById('v'); if(v){v.muted=${videoMuted};} true;`);
  }, [videoMuted]);

  const handleVideoTouch = () => {
    const now = Date.now();
    const last = lastTapRef.current || 0;
    
    if (now - last < DOUBLE_TAP_WINDOW) {
      // Double tap - like the video
      lastTapRef.current = 0;
      handleDoubleTap();
    } else {
      // Single tap - toggle play/pause
      lastTapRef.current = now;
      if (isVideo) {
        const nowPaused = !videoPaused;
        setVideoPaused(nowPaused);
        if (nowPaused) {
          setShowPauseIcon(true);
          setTimeout(() => setShowPauseIcon(false), 800);
        }
      }
    }
  };

  const handleDoubleTap = () => {
    if (!user) return;
    
    // Trigger like animation
    setDoubleTapLike(true);
    setTimeout(() => setDoubleTapLike(false), 1000);
    
    // Like the video if not already liked
    if (!item.is_liked) {
      handleLike();
    }
  };

  const handleLike = async () => {
    if (!user) return;
    
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 400);
    
    // Optimistic UI update
    const newLiked = !item.is_liked;
    const newLikes = newLiked ? item.votes + 1 : Math.max(0, item.votes - 1);
    
    // Update local state immediately
    if (setVideos) {
      setVideos(prev => prev.map(v => 
        v.id === item.id 
          ? { ...v, is_liked: newLiked, votes: newLikes }
          : v
      ));
    }
    
    try {
      await api.request(`/reels/${item.id}/vote/`, { method: 'POST' });
    } catch (error) {
      // Revert on error
      if (setVideos) {
        setVideos(prev => prev.map(v => 
          v.id === item.id 
            ? { ...v, is_liked: item.is_liked, votes: item.votes }
            : v
        ));
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    const newSaved = !item.is_saved;
    
    // Update local state immediately
    if (setVideos) {
      setVideos(prev => prev.map(v => 
        v.id === item.id 
          ? { ...v, is_saved: newSaved }
          : v
      ));
    }
    
    try {
      await api.request(`/reels/${item.id}/save/`, { method: 'POST' });
    } catch (error) {
      // Revert on error
      if (setVideos) {
        setVideos(prev => prev.map(v => 
          v.id === item.id 
            ? { ...v, is_saved: item.is_saved }
            : v
        ));
      }
    }
  };

  const handleFollowUser = async () => {
    if (!user || !item.user?.id) return;
    
    const currentFollowing = item.user?.is_following || false;
    const newFollowing = !currentFollowing;
    
    // Update local state immediately
    if (setVideos) {
      setVideos(prev => prev.map(v => 
        v.id === item.id 
          ? { ...v, user: { ...v.user, is_following: newFollowing } }
          : v
      ));
    }
    
    try {
      const response = await api.request('/follows/toggle/', {
        method: 'POST',
        body: JSON.stringify({ following_id: item.user.id }),
      });
      
      // Update the follow status if response contains it
      if (response.following !== undefined) {
        if (setVideos) {
          setVideos(prev => prev.map(v => 
            v.id === item.id 
              ? { ...v, user: { ...v.user, is_following: response.following } }
              : v
          ));
        }
      }
    } catch (error) {
      // Revert on error
      if (setVideos) {
        setVideos(prev => prev.map(v => 
          v.id === item.id 
            ? { ...v, user: { ...v.user, is_following: currentFollowing } }
            : v
        ));
      }
    }
  };

  const handleShareVideo = async () => {
    const url = `https://flipstar.app/post/${item.id}`;
    const title = item.caption ? item.caption.slice(0, 80) : 'Check out this reel on FlipStar';
    
    try {
      await Share.share({
        message: `${title} ${url}`,
        title: 'FlipStar Reel',
      });
      
      // Increment share count
      try { await api.request(`/reels/${item.id}/share/`, { method: 'POST' }); } catch {}
    } catch (error) {
      console.log('Share error:', error);
    }
    setShowMenu(false);
  };

  // Long-press handlers for TikTok-style context menu
  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowMenu(null); // Close dropdown menu if open
      setShowLongPressMenu({ videoId: item.id });
      // Haptic feedback on mobile if available
      // Note: expo-haptics not installed, skipping haptic feedback
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLongPressMove = () => {
    // Cancel long press if user moves finger
    handleLongPressEnd();
  };

  // Download video functionality
  const handleDownload = async () => {
    setShowLongPressMenu(null);
    setShowMenu(null);
    
    if (!user) {
      Alert.alert('Login Required', 'Please login to download videos');
      return;
    }
    
    let mediaUrl = item.media;
    
    // Apply Cloudinary transformations for smaller file size
    if (mediaUrl?.includes('cloudinary.com')) {
      if (mediaUrl.includes('/video/upload/')) {
        mediaUrl = mediaUrl.replace(
          '/video/upload/',
          '/video/upload/h_720,q_70,vc_h264/'
        );
      } else if (mediaUrl.includes('/image/upload/')) {
        mediaUrl = mediaUrl.replace(
          '/image/upload/',
          '/image/upload/h_1080,q_80,f_jpg/'
        );
      }
    }
    
    try {
      Alert.alert('Downloading', 'Preparing download...');
      
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      
      // For React Native, we need to use a different approach
      // This is a simplified version - in production you'd use expo-file-system
      Alert.alert('Download', 'Download feature requires expo-file-system');
    } catch (err) {
      console.error('Download failed:', err);
      Alert.alert('Download Failed', 'Could not download the video. Please try again.');
    }
  };

  // Save to favorites
  const handleSaveToFavorites = async () => {
    setShowLongPressMenu(null);
    setShowMenu(null);
    
    if (!user) {
      Alert.alert('Login Required', 'Please login to save to favorites');
      return;
    }
    
    try {
      await api.request(`/saved/`, {
        method: 'POST',
        body: JSON.stringify({ reel: item.id }),
      });
      Alert.alert('Success', 'Saved to favorites!');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Delete own reel
  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert('Delete Reel', 'Are you sure you want to delete this reel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.request(`/reels/${item.id}/`, { method: 'DELETE' });
            if (setVideos) setVideos(prev => prev.filter(v => v.id !== item.id));
          } catch {
            Alert.alert('Error', 'Failed to delete reel');
          }
        },
      },
    ]);
  };

  // Not interested
  const handleNotInterested = async () => {
    setShowLongPressMenu(null);
    setShowMenu(null);
    
    try {
      await api.request('/reels/not-interested/', {
        method: 'POST',
        body: JSON.stringify({ reel_id: item.id }),
      });
      // Remove video from feed locally
      if (setVideos) {
        setVideos(prev => prev.filter(v => v.id !== item.id));
      }
      Alert.alert('Video Removed', "This video won't appear in your feed anymore.");
    } catch (error) {
      console.error('Failed to mark not interested:', error);
      // Still remove from local feed even if API fails
      if (setVideos) {
        setVideos(prev => prev.filter(v => v.id !== item.id));
      }
    }
  };

  // Show video info
  const handleShowVideoInfo = () => {
    setShowLongPressMenu(null);
    setShowMenu(null);
    
    Alert.alert(
      'Video Information',
      `Creator: ${item.user?.username}\nLikes: ${item.votes}\nComments: ${item.comment_count}\nPosted: ${timeAgo(item.created_at)}`,
      [{ text: 'OK' }]
    );
  };

  // Handle hashtag click to search
  const handleHashtagClick = async (hashtag) => {
    if (!hashtag) return;
    const cleanTag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    try {
      const response = await api.request(`/reels/hashtag/${cleanTag}/`);
      const results = response.results || response || [];
      
      // Navigate to explore with hashtag filter
      // For now, just update the current feed with hashtag results
      if (setVideos) {
        const filteredResults = results.filter(reel => {
          if (!reel.media) return false;
          const isVideoFile = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(reel.media) || 
                              reel.media.includes('/video/upload/');
          return isVideoFile;
        });
        setVideos(shuffleArray(filteredResults));
      }
    } catch (error) {
      console.error('Failed to search hashtag:', error);
      Alert.alert('Error', 'Failed to load hashtag posts');
    }
  };

  const isOwnPost = user?.id === item.user?.id;
  const isFollowing = item.user?.is_following || false;

  return (
    <View style={styles.reelContainer}>
      {/* Video/Image Background */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleVideoTouch}
        onLongPress={handleLongPressStart}
        onPressOut={handleLongPressEnd}
        onMoveShouldSetResponder={handleLongPressMove}
        activeOpacity={1}
        delayLongPress={500}
      >
        {item.media ? (
          isVideo && videoUri ? (
            <WebView
              ref={webViewRef}
              source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}video.horizontal{object-fit:contain}</style></head><body><video id="v" ${isActive?'autoplay':''} loop muted playsinline webkit-playsinline preload="auto" src="${videoUri}"></video><script>var v=document.getElementById('v');v.addEventListener('loadedmetadata',function(){if(v.videoWidth>v.videoHeight){v.classList.add('horizontal');}});</script></body></html>` }}
              style={StyleSheet.absoluteFill}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled
              androidLayerType="hardware"
              startInLoadingState={false}
              onError={() => {}}
            />
          ) : null
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />
        )}

        {/* Pause Icon Overlay */}
        {showPauseIcon && isVideo && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={styles.pauseIconContainer}>
              <Ionicons name="pause" size={48} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        )}

        {/* Double Tap Heart Animation */}
        {doubleTapLike && (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
            <Animated.View style={styles.doubleTapHeart}>
              <Ionicons name="heart" size={80} color="#fff" />
            </Animated.View>
          </View>
        )}
      </TouchableOpacity>

      {/* Dark gradient overlay */}
      <View style={styles.gradient} pointerEvents="none" />


      {/* Right Side Actions */}
      <View style={styles.rightActions}>
        {/* Avatar with Follow Button */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={() => onShowProfile?.(item.user?.id)}>
            <Avatar uri={item.user?.profile_photo} size={48} name={item.user?.username} showBorder={true} />
          </TouchableOpacity>
          {!isOwnPost && (
            <TouchableOpacity 
              style={[
                styles.followBadge, 
                isFollowing && styles.followingBadge
              ]} 
              onPress={handleFollowUser}
            >
              {isFollowing ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Ionicons name="add" size={14} color="#000" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Sound Toggle Button */}
        <TouchableOpacity style={styles.actionItem} onPress={() => setVideoMuted(!videoMuted)}>
          <View style={styles.actionIcon}>
            <Ionicons 
              name={videoMuted ? 'volume-mute' : 'volume-high'}
              size={32}
              color={GOLD}
            />
          </View>
          <Text style={styles.actionLabel}>{videoMuted ? 'Off' : 'On'}</Text>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
          <View style={[
            styles.actionIcon,
            likeAnimation && styles.likeAnimation
          ]}>
            <Ionicons 
              name={item.is_liked ? 'heart' : 'heart-outline'}
              size={32}
              color={item.is_liked ? '#EF4444' : GOLD}
              fill={item.is_liked ? '#EF4444' : 'none'}
            />
          </View>
          <Text style={styles.actionLabel}>{item.votes || 0}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity style={styles.actionItem} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-outline" size={30} color={GOLD} />
          <Text style={styles.actionLabel}>{item.comment_count || 0}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionItem} onPress={handleShareVideo}>
          <Ionicons name="share-outline" size={28} color={GOLD} />
          <Text style={styles.actionLabel}>{item.shares || 0}</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.actionItem} onPress={handleSave}>
          <Ionicons 
            name={item.is_saved ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={item.is_saved ? LIGHT_GOLD : GOLD}
          />
        </TouchableOpacity>

        </View>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => onShowProfile?.(item.user?.id)}
        >
          <Text style={styles.username}>@{item.user?.username}</Text>
          {item.user?.verified && (
            <Ionicons name="checkmark-circle" size={14} color={LIGHT_GOLD} />
          )}
        </TouchableOpacity>
        
        {/* Caption with expand/collapse */}
        {item.caption && (
          <CaptionWithLessMore caption={item.caption} maxLength={100} />
        )}
        
        {/* Hashtags */}
        {item.hashtags && (
          <View style={styles.hashtagsContainer}>
            {String(item.hashtags).split(/[\s,]+/).filter(Boolean)
              .slice(0, 3)
              .map((tag, idx) => (
                <TouchableOpacity key={idx} onPress={() => handleHashtagClick(tag)}>
                  <Text style={styles.hashtag}>
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
        
        {/* Music/Track Info */}
        {item.music && (
          <View style={styles.musicInfo}>
            <Ionicons name="musical-note" size={12} color={LIGHT_GOLD} />
            <Text style={styles.musicText}>{item.music}</Text>
          </View>
        )}
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <CommentsModal 
          reel={item}
          user={user}
          onClose={() => setShowComments(false)}
        />
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <ReportModal 
          reel={item}
          onClose={() => setShowReportModal(false)}
        />
      </Modal>

      {/* Long-Press Context Menu */}
      {showLongPressMenu && (
        <Modal
          visible={!!showLongPressMenu}
          transparent
          animationType="slide"
          onRequestClose={() => setShowLongPressMenu(null)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLongPressMenu(null)}
          >
            <View style={styles.longPressSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Options</Text>
                <TouchableOpacity onPress={() => setShowLongPressMenu(null)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.longPressMenuItem} onPress={handleDownload}>
                  <Ionicons name="download-outline" size={20} color={LIGHT_GOLD} />
                  <Text style={styles.longPressMenuText}>Download</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.longPressMenuItem} onPress={handleSaveToFavorites}>
                  <Ionicons name="star-outline" size={20} color={LIGHT_GOLD} />
                  <Text style={styles.longPressMenuText}>Save to Favorites</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.longPressMenuItem} onPress={handleShareVideo}>
                  <Ionicons name="share-outline" size={20} color={LIGHT_GOLD} />
                  <Text style={styles.longPressMenuText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.longPressMenuItem} onPress={handleNotInterested}>
                  <Ionicons name="eye-off-outline" size={20} color="#EF4444" />
                  <Text style={[styles.longPressMenuText, { color: '#EF4444' }]}>Not Interested</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.longPressMenuItem} onPress={handleShowVideoInfo}>
                  <Ionicons name="information-circle-outline" size={20} color={LIGHT_GOLD} />
                  <Text style={styles.longPressMenuText}>Video Info</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.longPressMenuItem} 
                  onPress={() => { setShowLongPressMenu(null); setShowReportModal(true); }}
                >
                  <Ionicons name="flag-outline" size={20} color="#EF4444" />
                  <Text style={[styles.longPressMenuText, { color: '#EF4444' }]}>Report</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
});

// Comments Modal Component
const CommentsModal = React.memo(function CommentsModal({ reel, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/reels/${reel.id}/comments/?include_replies=true`);
      setComments(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to load comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!commentText.trim() || !user) return;
    
    setPostingComment(true);
    try {
      const c = await api.request(`/reels/${reel.id}/comments/`, {
        method: 'POST', 
        body: JSON.stringify({ text: commentText.trim() }),
      });
      setComments(prev => [c, ...prev]);
      setCommentText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.commentsSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={GOLD} />
            </View>
          ) : comments.length === 0 ? (
            <Text style={{ color: '#666', textAlign: 'center', padding: 32 }}>
              No comments yet
            </Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <Avatar uri={c.user?.profile_photo} size={32} name={c.user?.username} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.commentUser}>{c.user?.username}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        
        <View style={styles.commentInput}>
          <Avatar uri={user?.profile_photo} size={32} name={user?.username} />
          <TextInput
            style={styles.commentTextInput}
            placeholder="Add a comment..."
            placeholderTextColor="#666"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
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
  );
});

// Report Modal Component
function ReportModal({ reel, onClose }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    { id: 'spam', label: 'Spam', icon: 'alert-circle-outline' },
    { id: 'inappropriate', label: 'Inappropriate Content', icon: 'warning-outline' },
    { id: 'harassment', label: 'Harassment', icon: 'person-outline' },
    { id: 'copyright', label: 'Copyright Violation', icon: 'lock-closed-outline' },
    { id: 'violence', label: 'Violence', icon: 'flash-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
  ];

  const submitReport = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      await api.request('/reports/create/', {
        method: 'POST',
        body: JSON.stringify({
          reported_reel_id: reel.id,
          report_type: selectedReason,
          description: `Reported as ${selectedReason}`,
        }),
      });
      Alert.alert('Success', 'Report submitted successfully');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, reel.id, onClose]);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.reportSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Report Content</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.reportDescription}>
            Why are you reporting this content?
          </Text>
          
          {reportReasons.map(reason => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reportReasonItem,
                selectedReason === reason.id && styles.reportReasonItemSelected
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Ionicons 
                name={reason.icon} 
                size={20} 
                color={selectedReason === reason.id ? GOLD : '#666'} 
              />
              <Text style={[
                styles.reportReasonText,
                selectedReason === reason.id && styles.reportReasonTextSelected
              ]}>
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <Ionicons name="checkmark-circle" size={20} color={GOLD} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.reportActions}>
          <TouchableOpacity 
            style={[styles.reportCancelBtn]} 
            onPress={onClose}
          >
            <Text style={styles.reportCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.reportSubmitBtn,
              !selectedReason && styles.reportSubmitBtnDisabled
            ]}
            onPress={submitReport}
            disabled={!selectedReason || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.reportSubmitText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
export default function ReelsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const user = auth?.user ?? null;
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('for_you');
  const [screenMenuVisible, setScreenMenuVisible] = useState(false);
  const [screenShowReport, setScreenShowReport] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const LIMIT = 10;
  const initialVideoId = route?.params?.initialVideoId;
  const flatListRef = useRef(null);

  // ── Feed cache helpers (stale-while-revalidate) ──────────────────────────
  const CACHE_KEY = (tab) => `feed_cache_${tab}`;
  const CACHE_TTL = 2 * 60 * 1000; // 2 min for faster post distribution
  const readFeedCache = async (tab) => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY(tab));
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) { await AsyncStorage.removeItem(CACHE_KEY(tab)); return null; }
      return data;
    } catch { return null; }
  };
  const writeFeedCache = async (tab, data) => {
    try { await AsyncStorage.setItem(CACHE_KEY(tab), JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

  useEffect(() => {
    const loadFeed = async () => {
      const endpoint = activeTab === 'following'
        ? `/reels/following/?limit=${LIMIT}&offset=0`
        : `/reels/?limit=${LIMIT}&offset=0`;
      
      // Show cached data immediately so it's visible instantly
      const cached = await readFeedCache(activeTab);
      if (cached?.length > 0) {
        let results = cached;
        if (initialVideoId) {
          const idx = results.findIndex(r => r.id === initialVideoId);
          if (idx > 0) { const [item] = results.splice(idx, 1); results.unshift(item); }
        }
        setReels(results);
        setLoading(false);
      }
      
      // Then fetch fresh data in background
      const stale = api.requestStale(endpoint, (fresh) => {
        let results = Array.isArray(fresh) ? fresh : (fresh.results || []);
        if (initialVideoId) {
          const idx = results.findIndex(r => r.id === initialVideoId);
          if (idx > 0) { const [item] = results.splice(idx, 1); results.unshift(item); }
        }
        
        // Only show video content in reels
        const filteredResults = results.filter(reel => reel && reel.media);
        
        // Shuffle for randomized feed
        const shuffledResults = shuffleArray(filteredResults);
        
        setReels(shuffledResults);
        setHasMore(shuffledResults.length === LIMIT);
        
        // Persist fresh data so next load is instant
        if (shuffledResults.length > 0) {
          writeFeedCache(activeTab, shuffledResults);
        }
      });
      
      if (!cached) {
        fetchReels(0, true);
      }
    };
    
    loadFeed();
  }, [activeTab]);

  const fetchReels = async (offset = 0, reset = false) => {
    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      
      let endpoint = activeTab === 'following'
        ? `/reels/following/?limit=${LIMIT}&offset=${offset}`
        : `/reels/?limit=${LIMIT}&offset=${offset}`;
      
      const data = await api.request(endpoint);
      let results = Array.isArray(data) ? data : (data.results || []);
      
      // Only show video content in reels
      const filteredResults = results.filter(reel => reel && reel.media);
      
      // Shuffle for randomized feed
      const shuffledResults = shuffleArray(filteredResults);
      
      // Reorder if initialVideoId is specified
      if (reset && initialVideoId) {
        const idx = shuffledResults.findIndex(r => r.id === initialVideoId);
        if (idx > 0) { 
          const [item] = shuffledResults.splice(idx, 1); 
          shuffledResults.unshift(item); 
        }
      }
      
      setReels(prev => reset ? shuffledResults : [...prev, ...shuffledResults]);
      setHasMore(shuffledResults.length === LIMIT);
    } catch (e) { 
      console.error('Reels error:', e); 
    } finally { 
      setLoading(false); 
      setLoadingMore(false); 
    }
  };

  const onViewableChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setActiveIndex(newIndex);
    }
  }, []);

  const onEndReached = () => {
    if (!loadingMore && hasMore) {
      fetchReels(reels.length, false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(80);
    try {
      // Clear cache and fetch fresh data
      try { await AsyncStorage.removeItem(CACHE_KEY(activeTab)); } catch {}
      await fetchReels(0, true);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    }
  };

  // Handle tab reselect to scroll to top and refresh
  const handleTabReselect = (tab) => {
    if (tab === activeTab) {
      // Scroll to top
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      // Refresh feed
      onRefresh();
    }
  };

  const handleShowProfile = (userId) => {
    navigation.navigate('Profile', { userId });
  };

  const handleTabPress = (tab) => {
    if (tab === 'explore') {
      navigation.navigate('Explore');
      return;
    }
    setActiveTab(tab);
  };

  const handleNavigate = useCallback((screen, params) => {
    navigation.navigate(screen, params);
  }, [navigation]);

  const currentReel = reels[activeIndex];
  const isOwnCurrentReel = user?.id === currentReel?.user?.id;

  const screenHandleShare = useCallback(async () => {
    setScreenMenuVisible(false);
    if (!currentReel) return;
    try {
      await Share.share({ message: `Check out this reel on FlipStar!` });
    } catch {}
  }, [currentReel]);

  const screenHandleNotInterested = useCallback(async () => {
    setScreenMenuVisible(false);
    if (!currentReel) return;
    try {
      await api.request('/reels/not-interested/', {
        method: 'POST',
        body: JSON.stringify({ reel_id: currentReel.id }),
      });
    } catch {}
    setReels(prev => prev.filter(v => v.id !== currentReel.id));
  }, [currentReel]);

  const screenHandleDelete = useCallback(() => {
    setScreenMenuVisible(false);
    if (!currentReel) return;
    Alert.alert('Delete Reel', 'Are you sure you want to delete this reel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.request(`/reels/${currentReel.id}/`, { method: 'DELETE' });
            setReels(prev => prev.filter(v => v.id !== currentReel.id));
          } catch {
            Alert.alert('Error', 'Failed to delete reel');
          }
        },
      },
    ]);
  }, [currentReel]);

  const renderReel = useCallback(({ item, index }) => (
    <ReelItem
      item={item}
      index={index}
      isActive={index === activeIndex}
      user={user}
      videos={reels}
      setVideos={setReels}
      onShowProfile={handleShowProfile}
      onNavigate={handleNavigate}
    />
  ), [activeIndex, user, reels, handleShowProfile, handleNavigate]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <View style={[
          styles.refreshIndicator,
          { height: Math.min(pullDistance, 120) }
        ]}>
          <View style={[
            styles.spinner,
            isRefreshing && styles.spinnerSpinning,
            { transform: [{ rotate: `${(pullDistance / 80) * 360}deg` }] }
          ]}>
            <Ionicons name="refresh" size={20} color={GOLD} />
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { top: insets.top + 8 }]}>
        {['for_you', 'following'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => handleTabPress(tab)} 
            style={styles.tabBtn}
          >
            <Text style={[
              styles.tabText, 
              activeTab === tab && styles.tabTextActive
            ]}>
              {tab === 'for_you' ? 'For You' : 'Following'}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Video Feed - TikTok Style */}
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={r => String(r.id)}
        renderItem={renderReel}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="center"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor={GOLD} 
            colors={[GOLD]}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={GOLD} />
              <Text style={{ color: GOLD, marginTop: 8, fontSize: 12 }}>Loading more videos...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Text style={{ color: '#666', fontSize: 16 }}>No reels yet</Text>
            <Text style={{ color: '#666', marginTop: 8 }}>Be the first to share a reel!</Text>
          </View>
        }
      />

      {/* Fixed top-right overlay — AFTER FlatList so it renders on top */}
      <View style={[styles.topRightActions, { top: insets.top + 10, zIndex: 999, elevation: 20 }]}>
        <TouchableOpacity style={styles.topActionBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color={LIGHT_GOLD} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topActionBtn} onPress={() => setScreenMenuVisible(v => !v)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={LIGHT_GOLD} />
        </TouchableOpacity>
      </View>

      {/* Dropdown rendered separately so it's never clipped */}
      {screenMenuVisible && (
        <View style={[styles.dropdownMenu, { top: insets.top + 70, right: 16, zIndex: 1000, elevation: 25 }]}>
          <TouchableOpacity style={styles.menuItem} onPress={screenHandleShare}>
            <Ionicons name="share-outline" size={18} color={LIGHT_GOLD} />
            <Text style={styles.menuText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={screenHandleNotInterested}>
            <Ionicons name="eye-off-outline" size={18} color="#78716C" />
            <Text style={styles.menuText}>Not Interested</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setScreenMenuVisible(false); setScreenShowReport(true); }}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Report</Text>
          </TouchableOpacity>
          {isOwnCurrentReel && (
            <TouchableOpacity style={styles.menuItem} onPress={screenHandleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Screen-level Report Modal */}
      {screenShowReport && currentReel && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setScreenShowReport(false)}>
          <View style={styles.modalOverlay}>
            <ReportModal reel={currentReel} onClose={() => setScreenShowReport(false)} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  // Reel Container
  reelContainer: { 
    width, 
    height, 
    backgroundColor: '#000',
    position: 'relative',
  },
  
  // Gradient Overlay
  gradient: {
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 280,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
  },
  
  // Top Right Actions
  topRightActions: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  topActionBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Right Side Actions
  rightActions: { 
    position: 'absolute', 
    right: 12, 
    bottom: 120, 
    alignItems: 'center', 
    gap: 20,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  followBadge: {
    position: 'absolute', 
    bottom: -6, 
    left: '50%', 
    marginLeft: -10,
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    backgroundColor: GOLD,
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  followingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#fff',
  },
  actionItem: { 
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 6,
  },
  actionIcon: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeAnimation: {
    transform: [{ scale: 1.2 }],
  },
  actionLabel: { 
    color: GOLD, 
    fontSize: 12, 
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  // Bottom Info
  bottomInfo: { 
    position: 'absolute', 
    bottom: 30, 
    left: 12, 
    right: 90,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  username: {
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 14, 
    lineHeight: 18, 
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  moreLessBtn: {
    color: LIGHT_GOLD,
    fontWeight: '600',
    fontSize: 12,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  hashtag: {
    color: LIGHT_GOLD, 
    fontSize: 13, 
    fontWeight: '600',
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  musicText: {
    color: LIGHT_GOLD,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Video Controls
  pauseIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleTapHeart: {
    transform: [{ scale: 1.5 }],
    opacity: 0.8,
  },
  
  // Tab Navigation
  tabContainer: {
    position: 'absolute', 
    left: 0, 
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 24, 
    zIndex: 10,
  },
  tabBtn: { 
    alignItems: 'center', 
    paddingVertical: 8,
  },
  tabText: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 15, 
    fontWeight: '600' 
  },
  tabTextActive: { 
    color: '#fff', 
    fontWeight: '800' 
  },
  tabIndicator: { 
    width: 20, 
    height: 2, 
    backgroundColor: '#fff', 
    borderRadius: 1, 
    marginTop: 4 
  },
  
  // Refresh Indicator
  refreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(226,179,85,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: GOLD,
    borderTopColor: 'transparent',
  },
  spinnerSpinning: {
    // Animation would be added here with Animated API
  },
  
  // Modals
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  
  // Comments Modal
  commentsSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    paddingBottom: 20,
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
    maxHeight: 80,
  },
  
  // Report Modal
  reportSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    paddingBottom: 20,
  },
  reportDescription: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    textAlign: 'center',
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  reportReasonItemSelected: {
    backgroundColor: 'rgba(200,181,106,0.1)',
  },
  reportReasonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  reportReasonTextSelected: {
    color: LIGHT_GOLD,
    fontWeight: '600',
  },
  reportActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  reportCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  reportCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportSubmitBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
  },
  reportSubmitBtnDisabled: {
    backgroundColor: '#444',
  },
  reportSubmitText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Long-Press Menu
  longPressSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '50%',
    paddingBottom: 20,
  },
  longPressMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  longPressMenuText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
