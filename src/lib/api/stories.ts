import { supabase } from '../supabase';
import { Story } from '../../types';
import { mapProfileToUser } from '../../store/authStore';

export interface StoryGroup {
  user: Story['user'];
  stories: Story[];
  hasUnseen: boolean;
}

export async function getActiveStories(): Promise<StoryGroup[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: storiesData, error } = await supabase
    .from('stories')
    .select(`
      id, user_id, media_url, media_type, caption, expires_at, created_at, views_count,
      profiles(id, username, display_name, avatar_url)
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !storiesData) {
    console.error('Error loading stories:', error);
    return [];
  }

  const { data: viewedRows } = await supabase
    .from('story_views')
    .select('*')
    .eq('viewer_id', user.id);

  const viewedSet = new Set((viewedRows || []).map((v: any) => v.story_id));

  const grouped = new Map<string, StoryGroup>();

  for (const s of storiesData) {
    const profile = mapProfileToUser(s.profiles as any);
    const isViewed = viewedSet.has(s.id);

    const story: Story = {
      id: s.id,
      user: profile,
      isUnread: !isViewed,
      avatar: s.media_url,
      media_url: s.media_url,
      media_type: (s.media_type as 'image' | 'video' | 'text' | 'poll') || 'image',
      caption: s.caption || undefined,
      expires_at: s.expires_at,
      views_count: s.views_count,
      created_at: s.created_at,
    };

    const existing = grouped.get(profile.id);
    if (existing) {
      existing.stories.push(story);
      if (!isViewed) existing.hasUnseen = true;
    } else {
      grouped.set(profile.id, {
        user: profile,
        stories: [story],
        hasUnseen: !isViewed,
      });
    }
  }

  return Array.from(grouped.values());
}

export async function recordStoryView(storyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('story_views')
    .upsert(
      { story_id: storyId, viewer_id: user.id },
      { onConflict: 'story_id,viewer_id', ignoreDuplicates: true }
    );

  try {
    await supabase.rpc('increment_story_views' as any, { story_id: storyId });
  } catch {
    const { data } = await supabase
      .from('stories')
      .select('views_count')
      .eq('id', storyId)
      .maybeSingle();
    if (data) {
      await supabase
        .from('stories')
        .update({ views_count: (data as any).views_count + 1 })
        .eq('id', storyId);
    }
  }
}

export async function getStoryViewers(storyId: string): Promise<{ id: string; username: string; avatar_url: string | null; display_name: string | null }[]> {
  const { data, error } = await supabase
    .from('story_views')
    .select('viewer_id, profiles:viewer_id(id, username, avatar_url, display_name)')
    .eq('story_id', storyId)
    .order('viewed_at', { ascending: false });

  if (error || !data) return [];

  return data.map((v: any) => ({
    id: v.profiles?.id,
    username: v.profiles?.username,
    avatar_url: v.profiles?.avatar_url,
    display_name: v.profiles?.display_name,
  })).filter(Boolean);
}

export async function createStory(
  mediaUrl: string,
  options?: { mediaType?: 'image' | 'video'; caption?: string; audience?: 'public' | 'close_friends' }
): Promise<Story> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: user.id,
      media_url: mediaUrl,
      media_type: options?.mediaType || 'image',
      caption: options?.caption || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      audience: options?.audience || 'public',
    } as any)
    .select('*, profiles(*)')
    .single();

  if (error || !data) throw error || new Error('Failed to create story');

  return {
    id: data.id,
    user: mapProfileToUser(data.profiles as any),
    isUnread: true,
    avatar: data.media_url,
    media_url: data.media_url,
    media_type: data.media_type === 'video' ? 'video' : 'image',
    caption: data.caption || undefined,
    expires_at: data.expires_at,
    views_count: data.views_count,
    created_at: data.created_at,
  };
}
