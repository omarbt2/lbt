export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio?: string;
  cover_url?: string | null;
  website?: string | null;
  phone?: string | null;
  is_private?: boolean;
  is_verified?: boolean;
  posts_count?: number;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}

export interface Post {
  id: string;
  user: User;
  caption: string;
  category: string;
  timeLabel: string;
  imageUrl?: string;
  carouselImages?: string[];
  mediaType?: 'image' | 'video' | 'carousel';
  likes: number;
  commentsCount: number;
  hasLiked?: boolean;
  hasBookmarked?: boolean;
  tags?: string[];
  commentsList: Comment[];
}

export interface Comment {
  id: string;
  user: User;
  timeLabel: string;
  content: string;
  likes: number;
  hasLiked?: boolean;
}

export interface Story {
  id: string;
  user: User;
  isUnread: boolean;
  avatar: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  caption?: string;
  expires_at?: string;
  views_count?: number;
  created_at?: string;
  close_friends_only?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  voiceDuration?: string;
  timeLabel: string;
  isRead?: boolean;
  is_seen?: boolean;
  message_type?: 'text' | 'voice' | 'image' | 'gif' | 'call' | 'post_share';
  voice_url?: string;
  voice_duration_seconds?: number;
  gif_url?: string;
  gif_preview?: string;
  shared_post?: { id: string; image_url?: string; caption?: string };
  reply_to_id?: string;
  reply_to?: Message;
  reactions_count?: number;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user: User;
  unreadCount: number;
  messages: Message[];
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'mention' | 'follow' | 'system' | 'message' | 'story_view' | 'call';
  user?: User;
  postThumbnail?: string;
  post_id?: string;
  text: string;
  content?: string;
  contentSnippet?: string;
  imageUrl?: string;
  timeLabel: string;
  isUnread: boolean;
  created_at?: string;
}

export interface CreatorInsightMetric {
  reach: string;
  reachDelta: string;
  profileVisits: string;
  profileVisitsDelta: string;
  followers: string;
  followersDelta: string;
  chartData: { x: string; y: number }[];
}

export interface Note {
  id: string;
  user_id: string;
  content: string;
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface CallHistory {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'audio' | 'video';
  status: 'ringing' | 'ended' | 'rejected' | 'missed';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
}

export interface Reel {
  id: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  likes: string;
  comments: string;
  caption: string;
  musicName: string;
  originalSoundName: string;
}
