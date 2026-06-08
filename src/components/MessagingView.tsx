import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, Message, User } from '../types';
import {
  Plus, Search, Edit3, Send, Play, Pause, Paperclip, Smile, Phone, Video,
  ArrowLeft, MoreVertical, Mic, MicOff, Check, CheckCheck, Reply, X,
  BellOff, Trash2, Ban, Flag, PhoneIncoming, PhoneOutgoing, PhoneMissed
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from './ui/Avatar';
import {
  getChats, sendMessage, getConversationMessages, getOrCreateConversation,
  markMessagesAsSeen, markMessagesAsRead, addReaction, removeReaction,
  upsertTypingIndicator, removeTypingIndicator
} from '../lib/api/messages';
import { formatTimeLabel } from '../lib/api/posts';
import { getCallHistory } from '../lib/api/calls';
import { searchProfiles } from '../lib/api/profiles';
import GifPicker from './ui/GifPicker';
import type { GifResult } from './ui/GifPicker';
import LinkPreviewCard from './ui/LinkPreviewCard';
import { extractUrls } from '../lib/api/linkPreview';
import { getAllEmojis, QUICK_REACTIONS, EMOJI_CATEGORIES } from '../lib/api/emojis';
import type { EmojiItem } from '../lib/api/emojis';
import { useRealtimeMessages, useRealtimeReactions, useRealtimeTyping } from '../hooks/useRealtime';
import { supabase } from '../lib/supabase';
import { useOutletContext } from 'react-router-dom';
import type { OutletContextType } from '../types/context';
import BottomSheetMenu from './ui/BottomSheetMenu';
import type { BottomSheetMenuItem } from './ui/BottomSheetMenu';
import ReportModal from './ReportModal';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

interface MessagingViewProps {
  currentUser: User;
}

export default function MessagingView({ currentUser }: MessagingViewProps) {
  const { startCall, showPermissionDenied } = useOutletContext<OutletContextType>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [typeInput, setTypeInput] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<Record<string, number>>({});
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
  const [contextMenuUser, setContextMenuUser] = useState<User | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
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
    if (!activeChatId) return;
    getCallHistory(50, 0).then(setCallHistory).catch(() => setCallHistory([]));
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
      const expiresAt = disappearingEnabled
        ? new Date(Date.now() + 24 * 3600000).toISOString()
        : undefined;
      const userMsg = await sendMessage(activeChatId, userMessageText, {
        replyToId: replyId || undefined,
        expiresAt,
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = recordingDuration;
        setRecordingDuration(0);

        if (!activeChatId) return;

        try {
          const fileName = `voice/${currentUser.id}/${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from('voice-messages')
            .upload(fileName, blob, { contentType: 'audio/webm' });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            return;
          }

          const { data: urlData } = supabase.storage
            .from('voice-messages')
            .getPublicUrl(fileName);

          const voiceMsg = await sendMessage(activeChatId, '', {
            messageType: 'voice',
            voiceUrl: urlData.publicUrl,
            voiceDuration: duration,
          });

          setChats(prev => prev.map(c => {
            if (c.id !== activeChatId) return c;
            if (c.messages.some(m => m.id === voiceMsg.id)) return c;
            return { ...c, messages: [...c.messages, voiceMsg] };
          }));
        } catch (e: any) {
          console.error('Failed to send voice message:', e?.message || e);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Microphone access denied:', e);
      showPermissionDenied('microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleVoicePlayback = (msgId: string, url: string) => {
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
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleReaction = async (messageId: string, emoji: string) => {
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
  };

  const handleCallButton = async (callType: 'audio' | 'video') => {
    if (!activeChat || !activeChatId) return;
    try {
      await startCall(activeChat.user.id, callType);
    } catch (e) {
      console.error('Failed to initiate call:', e);
    }
  };

  const handleMessageContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setReactionPickerMessageId(reactionPickerMessageId === messageId ? null : messageId);
  };

  const handleMessageLongPress = (messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setReactionPickerMessageId(reactionPickerMessageId === messageId ? null : messageId);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const selectChatMobile = (id: string) => {
    setActiveChatId(id);
    setMobileChatOpen(true);
  };

  return (
    <div className="flex bg-surface h-[calc(100vh-140px)] rounded-2xl overflow-hidden border border-white/40 shadow-xl animate-scaleIn" id="messaging_screen">
      {/* SIDEBAR CHAT LIST */}
      <aside className={`w-full md:w-80 lg:w-96 border-r border-outline-variant bg-surface-container-lowest flex flex-col h-full shrink-0 transition-all ${
        mobileChatOpen ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-outline-variant bg-transparent">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold tracking-tighter text-primary">Direct Messages</h1>
            <button className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" aria-label="New message">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container border-none rounded-full py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant"
              placeholder="Search people to start a chat..."
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

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
            chats.map((c, index) => {
              const hasUnread = c.unreadCount > 0;
              const lastMsg = c.messages[c.messages.length - 1];
              const isSelected = c.id === activeChatId;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.22 }}
                  onClick={() => selectChatMobile(c.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected ? 'bg-surface-container-high shadow-sm border border-outline-variant/30' : 'hover:bg-surface-container/50'
                  }`}
                >
                  <div className="relative w-12 h-12 shrink-0">
                    <Avatar src={c.user.avatar} userId={c.user.id} name={c.user.name} size="lg" className="w-full h-full border border-white/40 shadow-sm" />
                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-on-surface rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`text-sm tracking-tight truncate ${isSelected ? 'font-bold text-primary' : 'font-semibold text-on-surface'}`}>
                        {c.user.name}
                      </h3>
                      <span className="text-[10px] text-outline font-medium shrink-0">
                        {lastMsg?.timeLabel || ''}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${hasUnread ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'}`}>
                      {lastMsg?.message_type === 'voice'
                        ? '🎤 Voice message'
                        : lastMsg?.text
                          ? (lastMsg.text.length > 35 ? lastMsg.text.slice(0, 35) + '...' : lastMsg.text)
                          : lastMsg?.imageUrl ? '📷 Shared photo' : 'Send a clean design spark'
                      }
                    </p>
                  </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenuChatId(c.id);
                    setContextMenuUser(c.user);
                  }}
                  className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors shrink-0"
                  aria-label="Chat options"
                >
                    <MoreVertical className="w-4 h-4 text-outline" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </aside>

      {/* CHAT FEED CANVAS */}
      <main className={`flex-1 flex flex-col h-full bg-surface-bright transition-all relative ${
        mobileChatOpen ? 'flex' : 'hidden md:flex'
      }`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <header className="flex justify-between items-center px-4 py-3 bg-[#0a0a0a] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden text-white/70 p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
                  title="Return to chats list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative shrink-0">
                   <Avatar src={activeChat.user.avatar} userId={activeChat.user.id} name={activeChat.user.name} size="md" />
                   {otherUserOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />}
                </div>
                <div className="min-w-0 text-left">
                  <h2 className="text-sm font-bold text-white truncate">{activeChat.user.name}</h2>
                  <p className="text-[10px] font-semibold flex items-center gap-1">
                    {otherUserTyping ? (
                      <span className="text-primary">Typing...</span>
                    ) : otherUserOnline ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active now
                      </>
                    ) : (
                      <span className="text-white/50">Last seen {otherUserLastSeen ? formatTimeLabel(otherUserLastSeen) : 'recently'}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setDisappearingEnabled(!disappearingEnabled)}
                  className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                    disappearingEnabled
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-white/10 text-white/70 border border-white/10'
                  }`}
                  title="Toggle disappearing messages (24h)"
                >
                  ⏱ {disappearingEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => handleCallButton('audio')}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
                  title="Voice Call"
                >
                  <Phone className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => handleCallButton('video')}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
                  title="Video Call"
                >
                  <Video className="w-4.5 h-4.5" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors" aria-label="More options">
                  <MoreVertical className="w-4.5 h-4.5" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 hover:no-scrollbar bg-surface-container-low/50">
              <div className="flex justify-center mb-2">
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider bg-surface-container px-3.5 py-1 rounded-full">
                  Design Studio Sync
                </span>
              </div>

              {(() => {
                const msgs = activeChat.messages || [];
                const formatCallTime = (ts: string) => {
                  const diff = Date.now() - new Date(ts).getTime();
                  const m = Math.floor(diff / 60000);
                  const h = Math.floor(m / 60);
                  const d = Math.floor(h / 24);
                  if (m < 1) return 'Just now';
                  if (m < 60) return `${m}m ago`;
                  if (h < 24) return `${h}h ago`;
                  return `${d}d ago`;
                };

                return (
                  <>
                    {callHistory.filter(c => c.status === 'rejected' || (c.status === 'ended' && !c.duration_seconds)).map(c => {
                      const isMissed = true;
                      const Icon = c.caller_id === currentUser.id ? PhoneOutgoing : PhoneMissed;
                      const label = c.call_type === 'video' ? '📹 Missed video call' : '📞 Missed voice call';
                      return (
                        <div key={c.id} className="flex justify-center my-3">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container border border-outline-variant/30 text-center">
                            <Icon className="w-4 h-4 text-error shrink-0" />
                            <span className="text-[11px] font-semibold text-on-surface-variant">{label}</span>
                          </div>
                        </div>
                      );
                    })}

                    {callHistory.filter(c => c.status !== 'rejected' && !(c.status === 'ended' && !c.duration_seconds)).map(c => {
                      const duration = c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}:${(c.duration_seconds % 60).toString().padStart(2, '0')}` : null;
                      const Icon = c.caller_id === currentUser.id ? PhoneOutgoing : PhoneIncoming;
                      return (
                        <div key={c.id} className="flex justify-center my-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                            <Icon className="w-3 h-3" />
                            <span>
                              {c.call_type === 'video' ? 'Video' : 'Voice'} call
                              {duration ? ` - ${duration}` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {msgs.map((m) => {
                      const isMe = m.senderId === currentUser.id;
                      return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    className="relative group"
                  >
                    {/* Reply-to preview */}
                    {m.reply_to && (
                      <div className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-1.5 rounded-xl text-[10px] border-l-2 ${
                          isMe
                            ? 'bg-primary/10 border-primary text-primary/80'
                            : 'bg-surface-container-high border-outline text-on-surface-variant'
                        }`}>
                          <span className="font-bold block truncate">{m.reply_to.senderName}</span>
                          <span className="truncate block opacity-70">{m.reply_to.text || 'Media'}</span>
                        </div>
                      </div>
                    )}

                    <div
                      className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      onContextMenu={(e) => handleMessageContextMenu(e, m.id)}
                      onMouseDown={() => handleMessageLongPress(m.id)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={() => handleMessageLongPress(m.id)}
                      onTouchEnd={handlePressEnd}
                    >
                      {!isMe && (
                        <Avatar
                          src={activeChat.user.avatar}
                          userId={activeChat.user.id}
                          name={activeChat.user.name}
                          size="xs"
                          className="w-7 h-7 mt-1 shrink-0 shadow-sm"
                        />
                      )}

                      <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Voice message */}
                        {m.message_type === 'voice' && m.voice_url && (
                          <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${
                            isMe
                              ? 'bg-gradient-to-tr from-primary to-primary-container text-white'
                              : 'bg-surface-container-high text-on-surface'
                          }`}>
                            <button
                              onClick={() => toggleVoicePlayback(m.id, m.voice_url!)}
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}
                              aria-label={playingVoiceId === m.id ? 'Pause voice message' : 'Play voice message'}
                            >
                              {playingVoiceId === m.id ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>
                            <div className="flex gap-0.5 items-center h-4">
                              {Array.from({ length: 20 }).map((_, i) => {
                                const h = Math.sin(i * 0.7 + m.id.charCodeAt(0)) * 0.5 + 0.5;
                                return (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-current rounded-full"
                                    style={{ height: `${Math.max(h * 14 + 2, 4)}px`, opacity: 0.7 }}
                                  />
                                );
                              })}
                            </div>
                            <span className="text-xs font-mono">
                              {m.voice_duration_seconds ? formatDuration(m.voice_duration_seconds) : '0:00'}
                            </span>
                          </div>
                        )}

                        {/* Text message */}
                        {m.text && !(m.message_type === 'voice' && m.text === '[Voice Message]' && m.voice_url) && (
                          <div className={`px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm text-left ${
                            isMe
                              ? 'bg-gradient-to-tr from-primary to-primary-container text-white rounded-tr-none'
                              : 'bg-surface-container-high text-on-surface rounded-tl-none'
                          }`}>
                            {m.text}
                          </div>
                        )}

                        {/* Image message */}
                        {m.imageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-outline-variant bg-surface p-1 shadow-sm max-w-xs">
                            <img src={m.imageUrl} alt="Shared" className="w-full h-auto rounded-xl" />
                          </div>
                        )}

                        {/* GIF message */}
                        {m.message_type === 'gif' && m.gif_url && (
                          <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-sm max-w-[200px]">
                            <img src={m.gif_url} alt="GIF" className="w-full h-auto rounded-2xl" loading="lazy" />
                          </div>
                        )}

                        {/* Shared post preview */}
                        {m.message_type === 'post_share' && m.shared_post && (
                          <div
                            className="border rounded-xl p-2 max-w-xs cursor-pointer hover:bg-surface-container/50 transition-colors"
                            onClick={() => {
                              if (m.shared_post?.id) window.location.href = `/post/${m.shared_post.id}`;
                            }}
                          >
                            {m.shared_post.image_url && (
                              <img
                                src={m.shared_post.image_url}
                                alt="Shared post"
                                className="rounded-lg w-full aspect-square object-cover"
                              />
                            )}
                            {m.shared_post.caption && (
                              <p className="text-xs mt-1 truncate text-on-surface-variant">
                                {m.shared_post.caption}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Link preview for URLs in text messages */}
                        {m.text && (() => {
                          const urls = extractUrls(m.text);
                          return urls.length > 0 ? (
                            <div className="mt-1">
                              <LinkPreviewCard url={urls[0]} />
                            </div>
                          ) : null;
                        })()}

                        {/* Reactions badge row */}
                        {m.reactions && m.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(
                              m.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(m.id, emoji)}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${
                                  m.reactions!.some(r => r.user_id === currentUser.id && r.emoji === emoji)
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'bg-surface-container-high border-outline-variant/50 text-on-surface-variant hover:border-primary/30'
                                }`}
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span className="font-bold">{count}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Time + read receipt */}
                        <div className={`flex items-center gap-1 px-1 mt-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[9px] font-bold text-outline">{m.timeLabel}</span>
                          {isMe && (
                            m.is_seen ? (
                               <CheckCheck className="w-3.5 h-3.5 text-primary" />
                            ) : m.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-outline" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-outline" />
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reaction picker popup */}
                    <AnimatePresence>
                    {reactionPickerMessageId === m.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 8 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                        className={`absolute z-30 flex gap-1 bg-surface-container-lowest/95 dark:bg-surface-container/95 backdrop-blur-md rounded-full px-2 py-1.5 shadow-xl border border-outline-variant/30 ${
                          isMe ? 'right-0' : 'left-10'
                        } -top-10`}
                      >
                        {QUICK_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReaction(m.id, emoji);
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-base hover:bg-surface-container-high hover:scale-125 transition-all active:scale-95"
                            aria-label={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
                  </>
                );
              })()}

              {/* Other user typing indicator */}
              {otherUserTyping && (
                <div className="flex gap-3 max-w-[80%] items-end mr-auto opacity-85">
                   <Avatar src={activeChat.user.avatar} userId={activeChat.user.id} name={activeChat.user.name} size="xs" className="w-7 h-7 shrink-0" />
                  <div className="bg-surface-container px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1 border border-white/60 shadow-sm">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
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

            {/* Input bar */}
            <footer className="p-4 bg-transparent border-t border-outline-variant/30 shrink-0">
              <div className="bg-surface-container-lowest/95 dark:bg-surface-container/95 border border-outline-variant/30 backdrop-blur-md rounded-full flex items-center p-1.5 gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0" aria-label="Attach file">
                  <Paperclip className="w-4.5 h-4.5" />
                </button>

                {!isRecording && import.meta.env.VITE_GIPHY_API_KEY && (
                  <button
                    onClick={() => setShowGifPicker(true)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0"
                    title="Send GIF"
                  >
                    <span className="text-[10px] font-bold border border-outline rounded px-1 py-0.5">GIF</span>
                  </button>
                )}

                {!isRecording && (
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0"
                    title="Emoji"
                  >
                    <Smile className="w-4.5 h-4.5" />
                  </button>
                )}

                {isRecording ? (
                  <div className="flex-1 flex items-center gap-2 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                    <span className="text-xs font-bold text-error">{formatDuration(recordingDuration)}</span>
                    <div className="flex-1 flex items-center gap-[2px] h-6">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[2px] bg-error/30 rounded-full animate-pulse"
                          style={{
                            height: `${Math.sin(Date.now() / 200 + i) * 50 + 50}%`,
                            animationDelay: `${i * 30}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    value={typeInput}
                    onChange={(e) => {
                      setTypeInput(e.target.value);
                      emitTyping();
                    }}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-transparent border-none text-xs text-on-surface py-2 focus:ring-0 outline-none placeholder:text-outline-variant"
                  />
                )}

                {/* Reply button (shown when replyToMessage is set but no text typed yet) */}
                {replyToMessage && !typeInput && !isRecording && (
                  <button
                    onClick={handleSendMessage}
                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 fill-white text-white ml-0.5" />
                  </button>
                )}

                {/* Microphone / Send toggle */}
                {!typeInput.trim() && !isRecording && !replyToMessage ? (
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={() => { if (isRecording) stopRecording(); }}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0"
                    title="Hold to record voice message"
                  >
                    <Mic className="w-4.5 h-4.5" />
                  </button>
                ) : isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="w-10 h-10 bg-error text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 animate-pulse"
                    aria-label="Stop recording"
                  >
                    <MicOff className="w-4 h-4" />
                  </button>
                ) : (
                  <motion.button
                    onClick={handleSendMessage}
                    disabled={!typeInput.trim()}
                    whileTap={{ scale: 0.88, rotate: 12 }}
                    className="w-10 h-10 bg-primary disabled:opacity-40 text-white rounded-full flex items-center justify-center shadow-md transition-all shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 fill-white text-white ml-0.5" />
                  </motion.button>
                )}
              </div>
            </footer>
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
            { icon: <BellOff size={18} />, label: 'Mute Notifications', onClick: () => { setContextMenuChatId(null); setContextMenuUser(null); } },
            { icon: <Trash2 size={18} />, label: 'Clear Chat', onClick: () => { setContextMenuChatId(null); setContextMenuUser(null); }, destructive: true },
            { icon: <Ban size={18} />, label: 'Block User', onClick: () => { setContextMenuChatId(null); setContextMenuUser(null); }, destructive: true },
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

      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden"
          >
            <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto border-b border-outline-variant/20 shrink-0">
              {EMOJI_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedEmojiCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                    selectedEmojiCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
              {(allEmojis.length > 0
                ? allEmojis.filter(e => e.category === selectedEmojiCategory)
                : QUICK_REACTIONS.map(e => ({ char: e, name: e, category: '', group: '', htmlCode: [], unicode: [] } as EmojiItem))
              ).map((emoji, i) => (
                <button
                  key={`${emoji.name}-${i}`}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-surface-container rounded-lg transition-colors"
                >
                  {emoji.char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
