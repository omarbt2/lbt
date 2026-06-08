import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, TrendingUp, TrendingDown, Eye, UserPlus, Users, Calendar, ArrowUpRight } from 'lucide-react';

export default function CreatorInsightsView() {
  const [activeMetric, setActiveMetric] = useState<'reach' | 'interactions'>('reach');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: string; y: number; index: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [insights, setInsights] = useState({
    reach: '0',
    reachDelta: '+0%',
    profileVisits: '0',
    profileVisitsDelta: '+0%',
    followers: '0',
    followersDelta: '+0',
    reachChartData: [] as { day: string; value: number }[],
    interactionsChartData: [] as { day: string; value: number }[],
  });
  const [topPosts, setTopPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('followers_count, following_count, posts_count')
        .eq('id', user.id)
        .maybeSingle();

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: posts } = await supabase
        .from('posts')
        .select('id, likes_count, comments_count, shares_count, media_urls, caption, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo);

      const totalLikes = (posts || []).reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
      const totalComments = (posts || []).reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);

      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const prevPostsFrom = thirtyDaysAgo;
      const { data: prevPosts } = await supabase
        .from('posts')
        .select('id, likes_count, comments_count')
        .eq('user_id', user.id)
        .gte('created_at', sixtyDaysAgo)
        .lt('created_at', prevPostsFrom);

      const prevLikes = (prevPosts || []).reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
      const prevComments = (prevPosts || []).reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
      const reachDelta = prevLikes === 0 ? (totalLikes > 0 ? 100 : 0) : Math.round(((totalLikes - prevLikes) / prevLikes) * 100);
      const interactionsDelta = prevComments === 0 ? (totalComments > 0 ? 100 : 0) : Math.round(((totalComments - prevComments) / prevComments) * 100);

      const reachChartData = (posts || []).map((p: any) => ({
        day: new Date(p.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        value: p.likes_count || 0,
      }));

      const interactionsChartData = (posts || []).map((p: any) => ({
        day: new Date(p.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        value: p.comments_count || 0,
      }));

      // Top performing posts (sorted by total engagement)
      const { data: allUserPosts } = await supabase
        .from('posts')
        .select('id, caption, media_urls, likes_count, comments_count, shares_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const sorted = (allUserPosts || [])
        .sort((a: any, b: any) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count))
        .slice(0, 5);

      setTopPosts(sorted);

      setInsights({
        reach: totalLikes > 1000 ? `${(totalLikes / 1000).toFixed(1)}k` : String(totalLikes),
        reachDelta: reachDelta > 0 ? `+${reachDelta}%` : `${reachDelta}%`,
        profileVisits: String((posts || []).length),
        profileVisitsDelta: interactionsDelta > 0 ? `+${interactionsDelta}%` : `${interactionsDelta}%`,
        followers: profile?.followers_count ? String(profile.followers_count) : '0',
        followersDelta: String((profile?.followers_count ?? 0) - (profile?.following_count ?? 0)),
        reachChartData: reachChartData.length > 0 ? reachChartData : [{ day: 'No data', value: 0 }],
        interactionsChartData: interactionsChartData.length > 0 ? interactionsChartData : [{ day: 'No data', value: 0 }],
      });
      setIsLoading(false);
    };
    fetchInsights();
  }, []);

  const activeData = Array.isArray(activeMetric === 'reach' ? insights.reachChartData : insights.interactionsChartData)
    ? (activeMetric === 'reach' ? insights.reachChartData : insights.interactionsChartData)
    : [];
  const safeData = activeData.length > 0 ? activeData : [{ day: 'No data', value: 0 }];
  const maxVal = (Math.max(...safeData.map((d) => d.value ?? 0)) || 1) * 1.1;

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 20 };

  const points = safeData.map((d, index) => {
    const x = padding.left + (safeData.length > 1 ? (index / (safeData.length - 1)) : 0.5) * (width - padding.left - padding.right);
    const y = height - padding.bottom - ((d.value ?? 0) / maxVal) * (height - padding.top - padding.bottom);
    return { x, y, day: d.day ?? '', value: d.value ?? 0 };
  });

  const pathD = points.length > 0
    ? points.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} C ${(points[i - 1].x + p.x) / 2} ${points[i - 1].y}, ${(points[i - 1].x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`),
        ''
      )
    : '';

  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : '';

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn py-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-7 w-40 bg-surface-container rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-surface-container rounded-md animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-container-lowest/90 rounded-2xl p-5 border border-outline-variant/30">
              <div className="h-4 w-24 bg-surface-container rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-surface-container rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-surface-container-lowest/90 rounded-2xl p-5 border border-outline-variant/30">
          <div className="h-[220px] bg-surface-container rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn py-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3" id="insights_header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Creator Insights</h1>
          <p className="text-sm text-on-surface-variant">Your content reach and analytics.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high transition-colors px-4 py-2 rounded-xl border border-outline-variant/30 shadow-sm cursor-pointer w-fit self-start">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-on-surface">Last 30 Days</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="insights_metrics">
        <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Reach</span>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <RefreshCw className="w-3 h-3 animate-spin-slow" /> live
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-on-surface leading-none">{insights.reach}</div>
            <div className="flex items-center gap-1 text-xs text-primary font-medium mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{insights.reachDelta} vs last period</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-on-surface" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Comments</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-on-surface leading-none">{insights.profileVisits}</div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{insights.profileVisitsDelta} vs last period</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-error" />
              <span className="text-xs font-semibold uppercase tracking-wider">Net Growth</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-on-surface leading-none">{insights.followers}</div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium mt-2">
              <span>{insights.followersDelta} net change</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center bg-transparent">
          <h2 className="text-lg font-bold text-on-surface">Engagement Trend</h2>
          <div className="flex bg-surface-container p-1 rounded-full text-xs">
            <button
              onClick={() => { setActiveMetric('reach'); setHoveredPoint(null); }}
              className={`px-4 py-1.5 rounded-full font-semibold transition-all ${
                activeMetric === 'reach'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Reach
            </button>
            <button
              onClick={() => { setActiveMetric('interactions'); setHoveredPoint(null); }}
              className={`px-4 py-1.5 rounded-full font-semibold transition-all ${
                activeMetric === 'interactions'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Interactions
            </button>
          </div>
        </div>

        <div className="relative w-full h-[220px] bg-surface-container-low/50 rounded-xl p-2 border border-outline-variant/10">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding.top + ratio * (height - padding.top - padding.bottom);
              return (
                <line
                  key={idx}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--color-outline-variant)"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                />
              );
            })}

            <path d={fillD} fill="url(#chart-grad)" />
            <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />

            {points.map((p, idx) => (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint?.index === idx ? 7 : 4}
                  fill={hoveredPoint?.index === idx ? 'var(--color-primary)' : '#ffffff'}
                  stroke="var(--color-primary)"
                  strokeWidth={hoveredPoint?.index === idx ? 3 : 2}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredPoint({ x: p.day, y: p.value, index: idx })}
                />
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="font-sans text-[10px] font-semibold fill-on-surface-variant"
                >
                  {p.day}
                </text>
              </g>
            ))}
          </svg>

          {hoveredPoint && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 backdrop-blur-md rounded-lg px-3 py-1.5 text-xs text-on-surface border border-outline-variant/20 shadow-md font-sans">
              <span className="font-semibold text-primary">{hoveredPoint.x}:</span>{' '}
              <span className="font-bold">{hoveredPoint.y.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-on-surface">Top Performing Content</h2>
        <div className="flex flex-col gap-2">
          {topPosts.length > 0 ? topPosts.map((post: any) => (
            <div key={post.id} className="flex items-center gap-4 bg-surface-container-lowest/75 dark:bg-surface-container/75 hover:bg-surface-container-lowest/95 dark:hover:bg-surface-container/95 transition-all p-3 rounded-2xl border border-outline-variant/30 shadow-sm cursor-pointer group">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                <img
                  src={post.media_urls?.[0] || ''}
                  alt="Post"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-sm font-semibold text-on-surface truncate">{post.caption || 'No caption'}</h4>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {new Date(post.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-on-surface flex items-center justify-end gap-0.5">
                  {(post.likes_count + post.comments_count).toLocaleString()} <ArrowUpRight className="w-3 h-3" />
                </div>
                <p className="text-[10px] text-outline font-semibold uppercase tracking-wider">Engagements</p>
              </div>
            </div>
          )) : (
            <div className="text-center py-10 bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30">
              <p className="text-xs font-semibold text-on-surface-variant">No posts yet. Create content to see insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
