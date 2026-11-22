import { supabase } from '../supabase';

export type ReportType = 'post' | 'user' | 'comment' | 'reel' | 'story' | 'message';

export async function reportContent(
  reportedId: string,
  reportType: ReportType,
  reason: string,
  reporterId: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reported_user_id: reportType === 'user' ? reportedId : null,
    post_id: ['post', 'reel'].includes(reportType) ? reportedId : null,
    type: reportType,
    reason,
    status: 'pending',
    description: description || '',
  });

  if (error) throw error;
}

export const REPORT_REASONS = [
  "It's spam",
  'Inappropriate content',
  'Harassment or bullying',
  'False information',
  'Violence or dangerous content',
  'Other',
] as const;
