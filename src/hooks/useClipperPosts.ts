import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedPost {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  posted_at: string | null;
  created_at: string;
}

export function useClipperPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clipper-posts', user?.id],
    queryFn: async (): Promise<UnifiedPost[]> => {
      if (!user?.id) return [];

      // Get user's accounts
      const [instagramAccs, tiktokAccs, youtubeAccs] = await Promise.all([
        supabase.from('instagram_accounts').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('tiktok_accounts').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('youtube_accounts').select('id').eq('user_id', user.id).eq('is_active', true),
      ]);

      const instagramIds = (instagramAccs.data || []).map(a => a.id);
      const tiktokIds = (tiktokAccs.data || []).map(a => a.id);
      const youtubeIds = (youtubeAccs.data || []).map(a => a.id);

      const posts: UnifiedPost[] = [];

      // Fetch Instagram posts
      if (instagramIds.length > 0) {
        const { data: igPosts } = await supabase
          .from('instagram_posts')
          .select('*')
          .in('account_id', instagramIds)
          .order('posted_at', { ascending: false, nullsFirst: false });

        (igPosts || []).forEach(post => {
          posts.push({
            id: post.id,
            platform: 'instagram',
            url: post.post_url,
            title: post.caption,
            thumbnail_url: post.thumbnail_url,
            views_count: post.views_count || 0,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            posted_at: post.posted_at,
            created_at: post.created_at,
          });
        });
      }

      // Fetch TikTok videos
      if (tiktokIds.length > 0) {
        const { data: ttVideos } = await supabase
          .from('tiktok_videos')
          .select('*')
          .in('account_id', tiktokIds)
          .order('posted_at', { ascending: false, nullsFirst: false });

        (ttVideos || []).forEach(video => {
          posts.push({
            id: video.id,
            platform: 'tiktok',
            url: video.video_url,
            title: video.caption,
            thumbnail_url: video.thumbnail_url,
            views_count: Number(video.views_count) || 0,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            posted_at: video.posted_at,
            created_at: video.created_at,
          });
        });
      }

      // Fetch YouTube videos
      if (youtubeIds.length > 0) {
        const { data: ytVideos } = await supabase
          .from('youtube_videos')
          .select('*')
          .in('account_id', youtubeIds)
          .order('published_at', { ascending: false, nullsFirst: false });

        (ytVideos || []).forEach(video => {
          posts.push({
            id: video.id,
            platform: 'youtube',
            url: video.video_url,
            title: video.title,
            thumbnail_url: video.thumbnail_url,
            views_count: Number(video.views_count) || 0,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            posted_at: video.published_at,
            created_at: video.created_at,
          });
        });
      }

      return posts;
    },
    enabled: !!user?.id,
  });
}

export function useRecentPosts(limit: number = 5) {
  const { data: allPosts, isLoading, refetch } = useClipperPosts();

  const recentPosts = [...(allPosts || [])]
    .sort((a, b) => {
      const dateA = new Date(a.posted_at || a.created_at).getTime();
      const dateB = new Date(b.posted_at || b.created_at).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);

  return { data: recentPosts, isLoading, refetch };
}

export function useMostViralPost() {
  const { data: allPosts, isLoading, refetch } = useClipperPosts();

  const viralPost = [...(allPosts || [])]
    .sort((a, b) => b.views_count - a.views_count)[0] || null;

  return { data: viralPost, isLoading, refetch };
}
