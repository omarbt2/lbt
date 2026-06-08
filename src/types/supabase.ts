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
          phone: string | null
          is_private: boolean | null
          is_verified: boolean | null
          posts_count: number | null
          followers_count: number
          following_count: number
          dob: string | null
          gender: string | null
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
          phone?: string | null
          is_private?: boolean | null
          is_verified?: boolean | null
          posts_count?: number | null
          followers_count?: number
          following_count?: number
          dob?: string | null
          gender?: string | null
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
          phone?: string | null
          is_private?: boolean | null
          is_verified?: boolean | null
          posts_count?: number | null
          followers_count?: number
          following_count?: number
          dob?: string | null
          gender?: string | null
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
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          participant1: string
          participant2: string
          user1_id: string
          user2_id: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          participant1?: string
          participant2?: string
          user1_id?: string
          user2_id?: string
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
          message_type: string
          reply_to_id: string | null
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
          message_type?: string
          reply_to_id?: string | null
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
          message_type?: string
          reply_to_id?: string | null
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
          receiver_id: string
          conversation_id: string | null
          call_type: string
          status: string
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          caller_id: string
          receiver_id: string
          conversation_id?: string | null
          call_type: string
          status?: string
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          caller_id?: string
          receiver_id?: string
          conversation_id?: string | null
          call_type?: string
          status?: string
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
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          type: 'like' | 'comment' | 'follow' | 'mention' | 'system'
          post_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          type?: 'like' | 'comment' | 'follow' | 'mention' | 'system'
          post_id?: string | null
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
    }
    Enums: {}
  }
}
