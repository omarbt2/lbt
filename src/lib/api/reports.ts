import { supabase } from '../supabase';

export type ReportType = 'post' | 'user' | 'comment' | 'reel' | 'story' | 'message';

export async function reportContent(
  reportedId: string,
  reportType: ReportType,
  reason: string,
  reporterId: string,
  description?: string
): Promise<void> {
  const { error } = await (supabase.from as any)('reports').insert({
    reporter_id: reporterId,
    post_id: reportedId,
    reason,
    description: description || '',
  });

  if (error) throw error;

  await (supabase.from as any)('notifications').insert({
    recipient_id: reportedId,
    user_id: reporterId,
    actor_id: reporterId,
    type: 'system',
    post_id: reportType === 'post' || reportType === 'reel' ? reportedId : null,
  });
}

export const REPORT_REASONS = [
  "It's spam",
  'Inappropriate content',
  'Harassment or bullying',
  'False information',
  'Violence or dangerous content',
  'Other',
] as const;
