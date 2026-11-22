-- ============================================================
-- LBT Social — Comprehensive Audit Fix Migration
-- Applied remotely: 2026-06-11
-- Supabase Project: nopnxlhknrrsttouevxd
-- ============================================================
-- This file documents all changes applied via MCP.
-- All migrations were applied and verified successfully.
-- ============================================================

-- ── SECTION 1: NOTES ─────────────────────────────────────────
-- Deduplicate notes (kept most recent per user)
-- Added UNIQUE(user_id) constraint for upsert support

-- ── SECTION 2: CONVERSATIONS ──────────────────────────────────
-- Added sync trigger: participant1/participant2 ↔ user1_id/user2_id
-- Back-filled existing rows
-- Both column pairs now kept in sync on INSERT

-- ── SECTION 3: DUPLICATE RPC CLEANUP ──────────────────────────
-- REMOVED old overloaded signatures:
--   mark_messages_read(uuid, uuid)         → now: mark_messages_read(uuid)
--   update_user_presence(uuid, boolean)    → now: update_user_presence(boolean DEFAULT true)
--   increment_story_views()                → now: increment_story_views(uuid)
--   get_explore(uuid, int, int)            → now: get_explore(int, int)
--   get_notifications(uuid, int, int)      → now: get_notifications(int, int)
--   get_or_create_conversation(uuid, uuid) → now: get_or_create_conversation(uuid)

-- ── SECTION 4: SECURITY DEFINER HARDENING ──────────────────────
-- All critical RPCs now use SECURITY DEFINER + SET search_path = public:
--   mark_messages_read, mark_messages_seen, update_user_presence,
--   increment_story_views, get_or_create_conversation,
--   get_notifications, get_explore, toggle_post_reaction,
--   fn_increment_unread (trigger function)

-- ── SECTION 5: NOTIFICATION RLS FIX ──────────────────────────
-- Fixed notif_select policy: was using auth.uid() = user_id
--                             now uses  auth.uid() = recipient_id
-- Fixed notif_update policy: same correction

-- ── SECTION 6: POSTS RLS — BLOCK ENFORCEMENT ──────────────────
-- Removed: "Public read posts", "read_all_posts"
-- Added:   "posts_select_auth" — hides posts from blocked/blocking users
--          "posts_select_anon" — anon can still read all posts

-- ── SECTION 7: UNREAD COUNTER TRIGGER ──────────────────────────
-- fn_increment_unread() — fires AFTER INSERT on messages
-- Increments unread_count1 or unread_count2 on conversations
-- Also updates last_message + last_message_at

-- ── SECTION 8: PERFORMANCE INDEXES ────────────────────────────
-- Added 15 new indexes:
--   conversations(participant1), conversations(participant2)
--   messages(sender_id)
--   messages(conversation_id, is_read) WHERE is_read = false
--   messages(conversation_id, is_seen) WHERE is_seen = false
--   notes(user_id), notes(expires_at)
--   posts(repost_of) WHERE repost_of IS NOT NULL
--   story_views(story_id), story_views(viewer_id)
--   follows(follower_id, following_id)
--   user_blocks(blocker_id), user_blocks(blocked_id)
--   calls(caller_id), calls(callee_id)

-- ── SECTION 9: GRANT EXECUTE ──────────────────────────────────
-- Granted EXECUTE to authenticated role on all app-facing RPCs:
--   get_post_reactions, get_unread_messages_count, block_user,
--   search_all, reset_unread_for_user, accept_follow_request,
--   decline_follow_request, get_pending_follow_requests,
--   get_suggested_users, get_post_insights, get_posts_by_hashtag,
--   get_call_history, create_call, update_call_status,
--   soft_delete_message, edit_message, search_profiles,
--   get_profile_posts, mark_messages_read, mark_messages_seen,
--   update_user_presence, increment_story_views,
--   get_or_create_conversation, get_notifications, get_explore,
--   toggle_post_reaction

-- ── SECTION 10: REALTIME ──────────────────────────────────────
-- Added to supabase_realtime publication:
--   conversations, story_views, webrtc_signals, typing_indicators

-- ── SECTION 11: DUPLICATE RLS CLEANUP ────────────────────────
-- Removed duplicate policies on message_reactions:
--   "Anyone can read msg reactions", "Users can manage own msg reactions"
--   "reaction_delete", "reaction_insert", "reaction_select"
-- Removed duplicate policies on post_reactions:
--   "Anyone can read reactions", "Users can manage own reactions"

-- ── SECTION 12: STORY VIEWS UNIQUE CONSTRAINT ─────────────────
-- Verified story_views_story_viewer_unique constraint exists
-- (Required for increment_story_views upsert ON CONFLICT)
