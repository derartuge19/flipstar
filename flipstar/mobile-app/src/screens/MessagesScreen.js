import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
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

function Avatar({ uri, size = 44, name = '' }) {
  const [err, setErr] = useState(false);
  if (uri && !err) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setErr(true)} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#000', fontWeight: '700', fontSize: size * 0.38 }}>{(name || '?')[0].toUpperCase()}</Text>
    </View>
  );
}

// Conversation list view
function ConversationList({ onOpen, user }) {
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.request('/messages/conversations/').then(d => {
      setConvos(Array.isArray(d) ? d : (d.results || []));
    }).catch(() => setConvos([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={GOLD} /></View>;

  return (
    <FlatList
      data={convos}
      keyExtractor={c => String(c.id)}
      renderItem={({ item }) => {
        const other = item.participants?.find(p => p.id !== user?.id) || item.other_user;
        return (
          <TouchableOpacity style={styles.convoRow} onPress={() => onOpen(item, other)}>
            <Avatar uri={other?.profile_photo} size={50} name={other?.username} />
            {item.unread_count > 0 && (
              <View style={styles.unreadDot}><Text style={styles.unreadNum}>{item.unread_count}</Text></View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.convoName}>{other?.username || 'Unknown'}</Text>
                <Text style={styles.convoTime}>{timeAgo(item.last_message?.created_at)}</Text>
              </View>
              <Text style={styles.convoPreview} numberOfLines={1}>{item.last_message?.content || 'No messages yet'}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Ionicons name="chatbubbles-outline" size={48} color="#333" />
          <Text style={{ color: '#666', marginTop: 12 }}>No messages yet</Text>
        </View>
      }
    />
  );
}

// Chat view
function ChatView({ conversation, otherUser, user, onBack }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);

  useEffect(() => {
    api.request(`/messages/conversations/${conversation.id}/messages/`).then(d => {
      const msgs = Array.isArray(d) ? d : (d.results || []);
      setMessages(msgs.reverse());
    }).catch(() => setMessages([])).finally(() => setLoading(false));
  }, [conversation.id]);

  const send = async () => {
    if (!text.trim()) return;
    const optimistic = { id: Date.now(), content: text.trim(), sender: user, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setSending(true);
    try {
      const msg = await api.request(`/messages/conversations/${conversation.id}/messages/`, {
        method: 'POST', body: JSON.stringify({ content: optimistic.content }),
      });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? msg : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Chat header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={GOLD} />
        </TouchableOpacity>
        <Avatar uri={otherUser?.profile_photo} size={36} name={otherUser?.username} />
        <Text style={styles.chatName}>{otherUser?.username}</Text>
      </View>

      {loading
        ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={GOLD} /></View>
        : <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => String(m.id)}
            renderItem={({ item }) => {
              const isMine = item.sender?.id === user?.id;
              return (
                <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
                  {!isMine && <Avatar uri={item.sender?.profile_photo} size={28} name={item.sender?.username} />}
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={{ padding: 12, gap: 8 }}
          />}

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.msgInput}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#555"
          multiline
        />
        <TouchableOpacity onPress={send} disabled={!text.trim() || sending} style={styles.sendBtn}>
          {sending ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="send" size={18} color="#000" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeConvo, setActiveConvo] = useState(null);
  const [activeOther, setActiveOther] = useState(null);

  if (activeConvo) {
    return (
      <View style={styles.container}>
        <ChatView conversation={activeConvo} otherUser={activeOther} user={user} onBack={() => setActiveConvo(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Ionicons name="create-outline" size={22} color={GOLD} />
      </View>
      <ConversationList user={user} onOpen={(c, o) => { setActiveConvo(c); setActiveOther(o); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  convoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER, position: 'relative' },
  convoName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  convoTime: { fontSize: 12, color: '#666' },
  convoPreview: { fontSize: 13, color: '#888', marginTop: 2 },
  unreadDot: { position: 'absolute', top: 12, left: 46, width: 18, height: 18, borderRadius: 9, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' },
  unreadNum: { fontSize: 10, color: '#000', fontWeight: '700' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
  chatName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMine: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  bubbleMine: { backgroundColor: GOLD, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: CARD, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#fff', lineHeight: 19 },
  bubbleTextMine: { color: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, borderTopColor: BORDER, gap: 8 },
  msgInput: { flex: 1, backgroundColor: CARD, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: BORDER },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' },
});
