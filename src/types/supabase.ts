export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          name: string | null
          full_name: string | null
          avatar_url: string | null
          cover_url: string | null
          bio: string | null
          website: string | null
          is_private: boolean | null
          is_verified: boolean | null
          is_online: boolean | null
          last_seen: string | null
          posts_count: number | null
          followers_count: number
          following_count: number
          blocked_count: number | null
          muted_count: number | null
          status_emoji: string | null
          status_text: string | null
          status_expires_at: string | null
          notif_likes: boolean | null
          notif_comments: boolean | null
          notif_dms: boolean | null
          notif_followers: boolean | null
          hide_activity: boolean | null
          allow_mentions: string | null
          is_following: boolean | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          bio?: string | null
          website?: string | null
          is_private?: boolean | null
          is_verified?: boolean | null
          is_online?: boolean | null
          last_seen?: string | null
          posts_count?: number | null
          followers_count?: number
          following_count?: number
          blocked_count?: number | null
          muted_count?: number | null
          status_emoji?: string | null
          status_text?: string | null
          status_expires_at?: string | null
          notif_likes?: boolean | null
          notif_comments?: boolean | null
          notif_dms?: boolean | null
          notif_followers?: boolean | null
          hide_activity?: boolean | null
          allow_mentions?: string | null
          is_following?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          bio?: string | null
          website?: string | null
          is_private?: boolean | null
          is_verified?: boolean | null
          is_online?: boolean | null
          last_seen?: string | null
          posts_count?: number | null
          followers_count?: number
          following_count?: number
          blocked_count?: number | null
          muted_count?: number | null
          status_emoji?: string | null
          status_text?: string | null
          status_expires_at?: string | null
          notif_likes?: boolean | null
          notif_comments?: boolean | null
          notif_dms?: boolean | null
          notif_followers?: boolean | null
          hide_activity?: boolean | null
          allow_mentions?: string | null
          is_following?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          caption: string
          category: string | null
          image_url: string | null
          media_urls: string[] | null
          media_type: string | null
          likes_count: number
          comments_count: number
          shares_count: number
          tags: string[] | null
          repost_of: string | null
          is_repost: boolean | null
          is_archived: boolean | null
          visibility: string | null
          close_friends_only: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caption: string
          category?: string | null
          image_url?: string | null
          media_urls?: string[] | null
          media_type?: string | null
          likes_count?: number
          comments_count?: number
          shares_count?: number
          tags?: string[] | null
          repost_of?: string | null
          is_repost?: boolean | null
          is_archived?: boolean | null
          visibility?: string | null
          close_friends_only?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caption?: string
          category?: string | null
          image_url?: string | null
          media_urls?: string[] | null
          media_type?: string | null
          likes_count?: number
          comments_count?: number
          shares_count?: number
          tags?: string[] | null
          repost_of?: string | null
          is_repost?: boolean | null
          is_archived?: boolean | null
          visibility?: string | null
          close_friends_only?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          id: string
          user_id: string
          media_url: string
          media_type: string
          caption: string | null
          bg_color: string | null
          audience: string | null
          close_friends_only: boolean | null
          expires_at: string
          views_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_url: string
          media_type?: string
          caption?: string | null
          bg_color?: string | null
          audience?: string | null
          close_friends_only?: boolean | null
          expires_at?: string
          views_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          media_url?: string
          media_type?: string
          caption?: string | null
          bg_color?: string | null
          audience?: string | null
          close_friends_only?: boolean | null
          expires_at?: string
          views_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewer_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          story_id: string
          viewer_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          viewer_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_posts: {
        Row: {
          post_id: string
          user_id: string
          collection_id: string | null
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          collection_id?: string | null
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          collection_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          likes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          likes_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          likes_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          participant1: string
          participant2: string
          user1_id: string
          user2_id: string
          is_muted1: boolean | null
          is_muted2: boolean | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          participant1: string
          participant2: string
          user1_id: string
          user2_id: string
          is_muted1?: boolean | null
          is_muted2?: boolean | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          participant1?: string
          participant2?: string
          user1_id?: string
          user2_id?: string
          is_muted1?: boolean | null
          is_muted2?: boolean | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string | null
          media_url: string | null
          media_type: string | null
          is_read: boolean
          is_seen: boolean
          voice_url: string | null
          voice_duration: number | null
          voice_duration_seconds: number | null
          message_type: string
          reply_to_id: string | null
          gif_url: string | null
          gif_preview: string | null
          video_url: string | null
          expires_at: string | null
          reactions_count: number
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          is_read?: boolean
          is_seen?: boolean
          voice_url?: string | null
          voice_duration?: number | null
          voice_duration_seconds?: number | null
          message_type?: string
          reply_to_id?: string | null
          gif_url?: string | null
          gif_preview?: string | null
          video_url?: string | null
          expires_at?: string | null
          reactions_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          is_read?: boolean
          is_seen?: boolean
          voice_url?: string | null
          voice_duration?: number | null
          voice_duration_seconds?: number | null
          message_type?: string
          reply_to_id?: string | null
          gif_url?: string | null
          gif_preview?: string | null
          video_url?: string | null
          expires_at?: string | null
          reactions_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      calls: {
        Row: {
          id: string
          caller_id: string
          callee_id: string | null
          receiver_id: string
          conversation_id: string | null
          call_type: string
          status: string
          duration_seconds: number | null
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          caller_id: string
          callee_id?: string | null
          receiver_id: string
          conversation_id?: string | null
          call_type: string
          status?: string
          duration_seconds?: number | null
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          caller_id?: string
          callee_id?: string | null
          receiver_id?: string
          conversation_id?: string | null
          call_type?: string
          status?: string
          duration_seconds?: number | null
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          type: 'like' | 'comment' | 'follow' | 'mention' | 'system'
          post_id: string | null
          content: string | null
          message: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          type: 'like' | 'comment' | 'follow' | 'mention' | 'system'
          post_id?: string | null
          content?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          type?: 'like' | 'comment' | 'follow' | 'mention' | 'system'
          post_id?: string | null
          content?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      follow_requests: {
        Row: {
          id: string
          requester_id: string
          target_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          target_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          target_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reels: {
        Row: {
          id: string
          user_id: string
          video_url: string
          thumbnail_url: string | null
          caption: string
          audio_name: string
          original_sound_name: string | null
          duration_sec: number
          likes_count: number
          comments_count: number
          views_count: number
          shares_count: number
          is_archived: boolean
          is_public: boolean
          collaborator_ids: string[] | null
          has_collab: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_url: string
          thumbnail_url?: string | null
          caption?: string
          audio_name?: string
          original_sound_name?: string | null
          duration_sec?: number
          likes_count?: number
          comments_count?: number
          views_count?: number
          shares_count?: number
          is_archived?: boolean
          is_public?: boolean
          collaborator_ids?: string[] | null
          has_collab?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_url?: string
          thumbnail_url?: string | null
          caption?: string
          audio_name?: string
          original_sound_name?: string | null
          duration_sec?: number
          likes_count?: number
          comments_count?: number
          views_count?: number
          shares_count?: number
          is_archived?: boolean
          is_public?: boolean
          collaborator_ids?: string[] | null
          has_collab?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reel_likes: {
        Row: {
          id: string
          reel_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          reel_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          reel_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          }
        ]
      }
      reel_views: {
        Row: {
          id: string
          reel_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          reel_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          reel_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          }
        ]
      }
      user_blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          content: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform: string
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: string
          is_active?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          reported_user_id: string | null
          post_id: string | null
          type: string
          reason: string
          status: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_id: string
          reported_user_id?: string | null
          post_id?: string | null
          type: string
          reason: string
          status?: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_id?: string
          reported_user_id?: string | null
          post_id?: string | null
          type?: string
          reason?: string
          status?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          cover_url: string | null
          is_private: boolean | null
          posts_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          cover_url?: string | null
          is_private?: boolean | null
          posts_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          cover_url?: string | null
          is_private?: boolean | null
          posts_count?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          subject: string
          description: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          description: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          description?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      link_previews: {
        Row: {
          id: string
          url: string
          title: string
          description: string
          image: string | null
          created_at: string
        }
        Insert: {
          id?: string
          url: string
          title?: string
          description?: string
          image?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          url?: string
          title?: string
          description?: string
          image?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      get_feed: {
        Args: {
          p_user_id: string
          p_limit: number
          p_offset: number
        }
        Returns: {
          id: string
          user_id: string
          caption: string
          category: string
          media_urls: string[]
          media_type: string
          likes_count: number
          comments_count: number
          shares_count: number
          tags: string[]
          created_at: string
          profiles: Json
          has_liked: boolean
          has_bookmarked: boolean
          comments: Json[]
        }[]
      }
      get_profile_posts: {
        Args: {
          p_profile_id: string
          p_viewer_id: string | null
          p_limit: number
          p_offset: number
        }
        Returns: {
          id: string
          caption: string
          category: string | null
          media_urls: string[] | null
          media_type: string | null
          likes_count: number
          comments_count: number
          tags: string[] | null
          created_at: string
          display_name: string | null
          username: string | null
          avatar_url: string | null
          has_liked: boolean
          has_bookmarked: boolean
        }[]
      }
      get_last_messages: {
        Args: {
          conv_ids: string[]
        }
        Returns: {
          conversation_id: string
          id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }[]
      }
      get_unread_messages_count: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      update_user_presence: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      get_post_insights: {
        Args: {
          p_post_id: string
        }
        Returns: Json
      }
      toggle_post_reaction: {
        Args: {
          p_post_id: string
          p_user_id: string
          p_reaction_type: string
        }
        Returns: boolean
      }
      get_post_reactions: {
        Args: {
          p_post_id: string
        }
        Returns: Json[]
      }
      search_profiles: {
        Args: {
          p_query: string
          p_limit: number
        }
        Returns: Json[]
      }
      get_notifications: {
        Args: {
          p_user_id: string
          p_limit: number
          p_offset: number
        }
        Returns: Json[]
      }
      increment_story_views: {
        Args: {
          story_id: string
        }
        Returns: void
      }
      save_permission_state: {
        Args: {
          p_mic?: string
          p_camera?: string
        }
        Returns: void
      }
      get_posts_by_hashtag: {
        Args: {
          p_hashtag: string
          p_limit: number
          p_offset: number
        }
        Returns: Json[]
      }
      cache_link_preview: {
        Args: {
          p_url: string
          p_title: string
          p_description: string
          p_image: string | null
        }
        Returns: void
      }
    }
    Enums: {}
  }
}
