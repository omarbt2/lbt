import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { OutletContextType } from '../types/context';
import { Chat, Message, User } from '../types';
import {
  Plus, Search, Edit3, BellOff, Trash2, Ban, Flag,
  Reply, X
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Avatar } from '../components/ui/Avatar';
import {
  getChats, sendMessage, getConversationMessages, getOrCreateConversation,
  markMessagesAsSeen, markMessagesAsRead, addReaction, removeReaction,
  upsertTypingIndicator, removeTypingIndicator
} from '../lib/api/messages';
import { searchProfiles } from '../lib/api/profiles';
import GifPicker from '../components/ui/GifPicker';
import type { GifResult } from '../components/ui/GifPicker';
import { getAllEmojis, EMOJI_CATEGORIES } from '../lib/api/emojis';
import type { EmojiItem } from '../lib/api/emojis';
import { useRealtimeMessages, useRealtimeReactions, useRealtimeTyping } from '../hooks/useRealtime';
import { supabase } from '../lib/supabase';
import BottomSheetMenu from '../components/ui/BottomSheetMenu';
import ReportModal from '../components/ReportModal';

import ChatListItem from '../components/messages/ChatListItem';
import ChatHeader from '../components/messages/ChatHeader';
import MessageBubble from '../components/messages/MessageBubble';
import MessageInput from '../components/messages/MessageInput';
import EmojiPickerPanel from '../components/messages/EmojiPickerPanel';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function MessagesPage() {
  const { currentUser, showPermissionDenied } = useOutletContext<OutletContextType>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [typeInput, setTypeInput] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<Record<string, number>>({});
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
  const [contextMenuUser, setContextMenuUser] = useState<User | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [allEmojis, setAllEmojis] = useState<EmojiItem[]>([]);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(EMOJI_CATEGORIES[0]);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [otherUserOnline, setOtherUserOnline] = useState<boolean>(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStopRequestedRef = useRef(false);
  const recordingDiscardRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);

  // Hide disappearing messages immediately in an already-open conversation.
  // The database cron job remains responsible for physical deletion.
  useEffect(() => {
    const cleanupExpiredFromView = () => {
      const now = Date.now();
      setChats((currentChats) => {
        let changed = false;
        const nextChats = currentChats.map((chat) => {
          const visibleMessages = chat.messages.filter((message) => {
            if (!message.expires_at) return true;
            const expiresAt = Date.parse(message.expires_at);
            return !Number.isFinite(expiresAt) || expiresAt > now;
          });
          if (visibleMessages.length === chat.messages.length) return chat;
          changed = true;
          return { ...chat, messages: visibleMessages };
        });
        return changed ? nextChats : currentChats;
      });
    };
    cleanupExpiredFromView();
    const intervalId = window.setInterval(cleanupExpiredFromView, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  const loadAllChats = async () => {
    setIsLoading(true);
    try {
      const data = await getChats();
      const uniqueChats = data.filter((chat, index, self) =>
        index === self.findIndex((c) => c.id === chat.id)
      );
      setChats(uniqueChats);
      if (uniqueChats.length > 0 && !activeChatId) {
        setActiveChatId(uniqueChats[0].id);
      }
    } catch (e) {
      console.error('Failed to load chats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllChats();
  }, []);

  useEffect(() => {
    if (!currentUser?.id || chats.length === 0) return;
    let active = true;
    const fetchUnread = async () => {
      const ids = chats.map(c => c.id);
      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .eq('is_read', false)
        .neq('sender_id', currentUser.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .neq('message_type', 'call')
        .neq('message_type', 'video');
      if (!active || error || !data) return;
      const counts: Record<string, number> = {};
      data.forEach((message: any) => {
        counts[message.conversation_id] = (counts[message.conversation_id] || 0) + 1;
      });
      setChats(prev => prev.map(chat => ({ ...chat, unreadCount: counts[chat.id] || 0 })));
    };
    void fetchUnread();
    const intervalId = window.setInterval(() => { void fetchUnread(); }, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [chats.length, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, otherUserTyping]);

  useEffect(() => {
    if (!activeChatId) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;
    const msgCount = chat.messages.length;
    if (msgCount === 0) {
      getConversationMessages(activeChatId).then(msgs => {
        setChats(prev => prev.map(c =>
          c.id === activeChatId ? { ...c, messages: msgs } : c
        ));
      });
    }
  }, [activeChatId]);

  useEffect(() => {
    if (activeChatId) {
      markMessagesAsSeen(activeChatId).catch(console.error);
      markMessagesAsRead(activeChatId).catch(console.error);
    }
  }, [activeChatId]);

  useEffect(() => {
    getAllEmojis().then(setAllEmojis).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeChat || !activeChat.user.id) return;
    const fetchOnlineStatus = async () => {
      const { data } = await (supabase
        .from('profiles')
        .select('is_online, last_seen')
        .eq('id', activeChat.user.id)
        .single() as any);
      if (data) {
        setOtherUserOnline(data.is_online || false);
        setOtherUserLastSeen(data.last_seen || null);
      }
    };
    fetchOnlineStatus();
  }, [activeChat?.user.id]);

  const handleGifSelect = async (gif: GifResult) => {
    if (!activeChatId) return;
    try {
      const msg = await sendMessage(activeChatId, '', {
        messageType: 'gif',
        gifUrl: gif.url,
        gifPreview: gif.preview,
      });
      setChats(prev => prev.map(c => {
        if (c.id !== activeChatId) return c;
        if (c.messages.some(m => m.id === msg.id)) return c;
        return { ...c, messages: [...c.messages, msg] };
      }));
    } catch (e) {
      console.error('Failed to send GIF:', e);
    }
  };

  const handleEmojiSelect = (emoji: EmojiItem) => {
    setTypeInput(prev => prev + emoji.char);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!activeChatId || !currentUser.id) return;
    const channel = supabase
      .channel(`conv_seen_${activeChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeChatId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.is_seen && updated.sender_id === currentUser.id) {
            setChats(prev => prev.map(c => {
              if (c.id !== activeChatId) return c;
              return {
                ...c,
                messages: c.messages.map(m =>
                  m.id === updated.id ? { ...m, is_seen: true } : m
                ),
              };
            }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChatId, currentUser.id]);

  const handleNewMessage = useCallback((newMsg: Message) => {
    setChats((prevChats) =>
      prevChats.map((c) => {
        if (c.messages.some((m) => m.id === newMsg.id)) return c;
        if (c.id === activeChatId) {
          return { ...c, messages: [...c.messages, newMsg] };
        }
        return { ...c, unreadCount: c.unreadCount + 1 };
      })
    );
    if (activeChatId) {
      markMessagesAsSeen(activeChatId).catch(console.error);
    }
  }, [activeChatId]);

  useRealtimeMessages(activeChatId, handleNewMessage);

  const handleReactionChange = useCallback((messageId: string, reactions: any[]) => {
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      return {
        ...c,
        messages: c.messages.map(m =>
          m.id === messageId ? { ...m, reactions, reactions_count: reactions.length } : m
        ),
      };
    }));
  }, [activeChatId]);

  const currentMessageIds = activeChat?.messages?.map(m => m.id) || [];
  useRealtimeReactions(currentMessageIds, handleReactionChange);

  const handleTypingChange = useCallback((userId: string, isTyping: boolean) => {
    setOtherUserTyping(isTyping);
  }, []);

  useRealtimeTyping(activeChatId, currentUser.id, handleTypingChange);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const users = await searchProfiles(searchQuery);
        setSearchResults(users.filter(u => u.id !== currentUser.id));
      } catch (err) {
        console.error('Error searching profiles:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const delayDebounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUser.id]);

  const handleStartChatWithUser = async (targetUser: User) => {
    try {
      setIsLoading(true);
      const chatId = await getOrCreateConversation(targetUser.id);
      setSearchQuery('');
      setSearchResults([]);
      const updatedChats = await getChats();
      const uniqueUpdated = updatedChats.filter((chat, index, self) =>
        index === self.findIndex((c) => c.id === chat.id)
      );
      setChats(uniqueUpdated);
      setActiveChatId(chatId);
      setMobileChatOpen(true);
    } catch (err) {
      console.error('Failed to instantiate user chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const emitTyping = useCallback(() => {
    if (!activeChatId) return;
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      upsertTypingIndicator(activeChatId).catch(console.error);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      removeTypingIndicator(activeChatId).catch(console.error);
    }, 2000);
  }, [activeChatId]);

  const handleSendMessage = async () => {
    if (!typeInput.trim() || !activeChatId) return;

    const userMessageText = typeInput;
    const replyId = replyToMessage?.id;
    setTypeInput('');
    setReplyToMessage(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      removeTypingIndicator(activeChatId).catch(console.error);
    }

    try {
      const userMsg = await sendMessage(activeChatId, userMessageText, {
        replyToId: replyId || undefined,
      });
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === activeChatId) {
            if (c.messages.some((m) => m.id === userMsg.id)) return c;
            return { ...c, messages: [...c.messages, userMsg] };
          }
          return c;
        })
      );
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const startRecording = async () => {
    recordingStopRequestedRef.current = false;
    recordingDiscardRef.current = false;
    const chatIdAtStart = activeChatId;
    const senderIdAtStart = currentUser.id;
    if (!chatIdAtStart || !senderIdAtStart || typeof MediaRecorder === 'undefined') {
      showPermissionDenied('microphone');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // A quick pointer-up may happen before the microphone permission prompt
      // resolves. In that case, do not unexpectedly begin recording later.
      if (recordingStopRequestedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ].find(type => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream?.getTracks().forEach(track => track.stop());
        const recordedType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: recordedType });
        const startedAt = recordingStartedAtRef.current;
        const duration = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1;
        recordingStartedAtRef.current = null;
        setRecordingDuration(0);

        if (recordingDiscardRef.current) {
          recordingDiscardRef.current = false;
          return;
        }
        if (!blob.size || (recordingStopRequestedRef.current && duration < 1)) return;

        try {
          const extension = recordedType.includes('mp4') ? 'm4a' : 'webm';
          const fileName = `voice/${senderIdAtStart}/${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from('voice-messages')
            .upload(fileName, blob, { contentType: recordedType });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('voice-messages')
            .getPublicUrl(fileName);

          if (!urlData?.publicUrl) throw new Error('Could not create a voice message URL.');

          const voiceMsg = await sendMessage(chatIdAtStart, '', {
            messageType: 'voice',
            voiceUrl: urlData.publicUrl,
            voiceDuration: duration,
          });

          setChats(prev => prev.map(chat => {
            if (chat.id !== chatIdAtStart) return chat;
            if (chat.messages.some(message => message.id === voiceMsg.id)) return chat;
            return { ...chat, messages: [...chat.messages, voiceMsg] };
          }));
        } catch (error: any) {
          console.error('Failed to send voice message:', error?.message || error);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('Voice recording failed:', event);
        stream?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        const startedAt = recordingStartedAtRef.current;
        setRecordingDuration(startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0);
      }, 250);
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      recordingStartedAtRef.current = null;
      console.error('Microphone access or recording failed:', error);
      showPermissionDenied('microphone');
    }
  };

  const stopRecording = () => {
    recordingStopRequestedRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    recordingDiscardRef.current = true;
    recordingStopRequestedRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const toggleVoicePlayback = useCallback((msgId: string, url: string) => {
    if (playingVoiceId === msgId) {
      const audio = audioElementsRef.current[msgId];
      if (audio) audio.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (playingVoiceId && audioElementsRef.current[playingVoiceId]) {
      audioElementsRef.current[playingVoiceId].pause();
    }

    if (!audioElementsRef.current[msgId]) {
      const audio = new Audio(url);
      audioElementsRef.current[msgId] = audio;
      audio.ontimeupdate = () => {
        setVoiceProgress(prev => ({ ...prev, [msgId]: (audio.currentTime / audio.duration) * 100 }));
      };
      audio.onended = () => {
        setPlayingVoiceId(null);
        setVoiceProgress(prev => ({ ...prev, [msgId]: 0 }));
      };
    }

    audioElementsRef.current[msgId].currentTime = 0;
    audioElementsRef.current[msgId].play();
    setPlayingVoiceId(msgId);
  }, [playingVoiceId]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const existing = activeChat?.messages.find(m => m.id === messageId)
        ?.reactions?.find(r => r.user_id === currentUser.id);

      if (existing && existing.emoji === emoji) {
        await removeReaction(messageId);
      } else if (existing) {
        await removeReaction(messageId);
        await addReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }

      setReactionPickerMessageId(null);
    } catch (e) {
      console.error('Failed to toggle reaction:', e);
    }
  }, [activeChat, currentUser.id]);

  const handleMessageContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setReactionPickerMessageId(reactionPickerMessageId === messageId ? null : messageId);
  };

  const handleMessageLongPress = (messageId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setReactionPickerMessageId(messageId);
      longPressTimerRef.current = null;
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const selectChatMobile = useCallback((id: string) => {
    setActiveChatId(id);
    setMobileChatOpen(true);
  }, []);

  const handleAttachmentSent = useCallback((msg: any) => {
    if (!activeChatId) return;
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      if (c.messages.some(m => m.id === msg.id)) return c;
      return { ...c, messages: [...c.messages, msg] };
    }));
  }, [activeChatId]);

  return (
    <div className="flex bg-surface h-[calc(100dvh-140px)] rounded-2xl overflow-hidden border border-white/40 shadow-xl animate-scaleIn" id="messaging_screen">
      {/* SIDEBAR CHAT LIST */}
      <aside className={`w-full md:w-80 lg:w-96 border-r border-outline-variant bg-surface-container-lowest flex flex-col h-full shrink-0 transition-all ${
        mobileChatOpen ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-outline-variant bg-transparent">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold tracking-tighter text-primary">Direct Messages</h1>
            <button onClick={() => { searchInputRef.current?.focus(); setSearchQuery(''); }}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" aria-label="New message">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container border-none rounded-full py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant"
              placeholder="Search people to start a chat..."
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {searchQuery.trim() !== '' && (
          <div className="bg-surface p-2 border-b border-outline-variant max-h-56 overflow-y-auto space-y-1 shrink-0">
            <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider px-2 mb-1">Search Results</h4>
            {isSearching ? (
              <p className="text-xs p-3 text-outline text-center animate-pulse">Searching profiles...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs p-3 text-outline text-center">No designers found matching "{searchQuery}"</p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleStartChatWithUser(user)}
                  className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all"
                >
                  <Avatar src={user.avatar} userId={user.id} name={user.name} size="sm" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-on-surface leading-none">{user.name}</div>
                    <div className="text-[10px] text-outline mt-0.5">@{user.username}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isLoading && chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 py-8 text-center text-outline animate-pulse">
              <span className="text-xs font-semibold">Loading discussions...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-outline p-4">
              <span className="text-xs font-medium">No active chats in your inbox.</span>
              <span className="text-[10px] opacity-70 mt-1">Search for a designer above to start a conversation!</span>
            </div>
          ) : (
            chats.map((c, index) => (
              <ChatListItem
                key={c.id}
                chat={c}
                isSelected={c.id === activeChatId}
                index={index}
                currentUserId={currentUser.id}
                onSelect={selectChatMobile}
                onContextMenu={(chatId, user) => {
                  setContextMenuChatId(chatId);
                  setContextMenuUser(user);
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* CHAT FEED CANVAS */}
      <main className={`flex-1 flex flex-col h-full bg-surface-bright transition-all relative ${
        mobileChatOpen ? 'flex' : 'hidden md:flex'
      }`}>
        {activeChat ? (
          <>
            <ChatHeader
              user={activeChat.user}
              otherUserOnline={otherUserOnline}
              otherUserLastSeen={otherUserLastSeen}
              otherUserTyping={otherUserTyping}
                      onBack={() => setMobileChatOpen(false)}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 hover:no-scrollbar bg-surface-container-low/50" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex justify-center mb-2">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-container px-3.5 py-1 rounded-full">
                  Design Studio Sync
                </span>
              </div>

              {(() => {
                const msgs = activeChat.messages || [];

                return (
                  <>
                    {msgs.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isMe={m.senderId === currentUser.id}
                        currentUser={currentUser}
                        activeChat={activeChat}
                        playingVoiceId={playingVoiceId}
                        voiceProgress={voiceProgress}
                        reactionPickerMessageId={reactionPickerMessageId}
                        onToggleVoicePlayback={toggleVoicePlayback}
                        onReaction={handleReaction}
                        onContextMenu={handleMessageContextMenu}
                        onLongPressStart={handleMessageLongPress}
                        onLongPressEnd={handlePressEnd}
                      />
                    ))}
                  </>
                );
              })()}

              {/* Other user typing indicator */}
              {otherUserTyping && (
                <div className="flex items-end gap-2 px-4 py-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                    {activeChat?.user.name?.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="bg-surface-container-highest border border-outline-variant/20 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                    <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply-to preview bar */}
            {replyToMessage && (
              <div className="px-4 py-2 bg-surface-container border-t border-outline-variant/30 flex items-center gap-2 animate-slideIn">
                <Reply className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary">{replyToMessage.senderName}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{replyToMessage.text || 'Media'}</p>
                </div>
                <button
                  onClick={() => setReplyToMessage(null)}
                  className="w-6 h-6 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline transition-colors"
                  aria-label="Cancel reply"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <MessageInput
              ref={inputRef}
              activeChat={activeChat}
              typeInput={typeInput}
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              replyToMessage={replyToMessage}
              showEmojiPicker={showEmojiPicker}
              onTypeInputChange={setTypeInput}
              onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
              onSendMessage={handleSendMessage}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancelRecording={cancelRecording}
              onClearReply={() => setReplyToMessage(null)}
              onEmitTyping={emitTyping}
              onAttachmentSent={handleAttachmentSent}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-outline">
            <span className="text-sm font-semibold">Select or search for a designer to begin syncing.</span>
          </div>
        )}
      </main>

      {contextMenuChatId && contextMenuUser && (
        <BottomSheetMenu
          isOpen={true}
          onClose={() => { setContextMenuChatId(null); setContextMenuUser(null); }}
          items={[
            { icon: <BellOff size={18} />, label: 'Mute Notifications', onClick: async () => {
              const conv = chats.find(c => c.id === contextMenuChatId);
              if (conv) {
                const isP1 = (conv as any).participant1 === currentUser.id;
                await (supabase as any).from('conversations').update(
                  isP1 ? { is_muted1: true } : { is_muted2: true }
                ).eq('id', conv.id);
                setChats(prev => prev.map(c => c.id === conv.id ? { ...c, isMuted: true } : c));
              }
              setContextMenuChatId(null); setContextMenuUser(null);
            }},
            { icon: <Trash2 size={18} />, label: 'Clear Chat', onClick: async () => {
              if (contextMenuChatId) {
                try {
                  await (supabase.from('messages') as any).delete()
                    .eq('conversation_id', contextMenuChatId)
                    .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);
                  setChats(prev => prev.filter(c => c.id !== contextMenuChatId));
                  if (activeChatId === contextMenuChatId) {
                    setActiveChatId(null);
                    setMobileChatOpen(false);
                  }
                } catch (err) { console.error('Clear chat failed:', err); }
              }
              setContextMenuChatId(null); setContextMenuUser(null);
            }, destructive: true },
            { icon: <Ban size={18} />, label: 'Block User', onClick: async () => {
              if (contextMenuUser) {
                try {
                  await supabase.from('user_blocks').insert({
                    blocker_id: currentUser.id,
                    blocked_id: contextMenuUser.id,
                  });
                  setChats(prev => prev.filter(c => c.user.id !== contextMenuUser.id));
                  if (activeChatId && chats.find(c => c.id === activeChatId)?.user.id === contextMenuUser.id) {
                    setActiveChatId(null);
                    setMobileChatOpen(false);
                  }
                } catch (err) { console.error('Block user failed:', err); }
              }
              setContextMenuChatId(null); setContextMenuUser(null);
            }, destructive: true },
            { icon: <Flag size={18} />, label: 'Report', onClick: () => {
              if (contextMenuUser) {
                setReportUserId(contextMenuUser.id);
                setShowReportModal(true);
              }
              setContextMenuChatId(null);
              setContextMenuUser(null);
            }, destructive: true },
          ]}
          header={{
            avatar: contextMenuUser.avatar || undefined,
            name: contextMenuUser.name,
          }}
        />
      )}

      {reportUserId && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => { setShowReportModal(false); setReportUserId(null); }}
          reportedId={reportUserId}
          reportType="user"
          reporterId={currentUser.id}
        />
      )}

      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={handleGifSelect}
      />

      <EmojiPickerPanel
        isOpen={showEmojiPicker}
        allEmojis={allEmojis}
        selectedEmojiCategory={selectedEmojiCategory}
        onSelectCategory={setSelectedEmojiCategory}
        onSelectEmoji={handleEmojiSelect}
      />
    </div>
  );
}
