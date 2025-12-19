import { supabase } from '@/integrations/supabase/client';

export interface InstagramAccount {
  id: string;
  user_id: string;
  username: string;
  profile_url: string;
  display_name: string | null;
  profile_image_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  bio: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramPost {
  id: string;
  account_id: string;
  post_url: string;
  post_type: string;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count: number;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    username?: string;
    displayName?: string;
    profileImageUrl?: string;
    bio?: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    posts?: Array<{
      postUrl: string;
      type: string;
      thumbnailUrl?: string;
      caption?: string;
      likesCount: number;
      commentsCount: number;
      viewsCount: number;
    }>;
  };
  error?: string;
}

export const instagramApi = {
  // Scrape Instagram profile
  async scrapeProfile(profileUrl: string): Promise<ScrapeResult> {
    const { data, error } = await supabase.functions.invoke('instagram-scrape', {
      body: { profileUrl, action: 'scrape' },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  },

  // Add a new Instagram account to monitor
  async addAccount(username: string, userId: string): Promise<{ success: boolean; account?: InstagramAccount; error?: string }> {
    const cleanUsername = username.replace('@', '');
    const profileUrl = `https://www.instagram.com/${cleanUsername}/`;
    
    // First, check if there's an existing account (even if inactive)
    const { data: existingAccount } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('username', cleanUsername)
      .maybeSingle();

    // First, scrape the profile to get initial data
    const scrapeResult = await this.scrapeProfile(profileUrl);
    
    // If account exists, reactivate and update it
    if (existingAccount) {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .update({
          is_active: true,
          display_name: scrapeResult.data?.displayName || existingAccount.display_name,
          profile_image_url: scrapeResult.data?.profileImageUrl || existingAccount.profile_image_url,
          followers_count: scrapeResult.data?.followersCount || existingAccount.followers_count,
          following_count: scrapeResult.data?.followingCount || existingAccount.following_count,
          posts_count: scrapeResult.data?.postsCount || existingAccount.posts_count,
          bio: scrapeResult.data?.bio || existingAccount.bio,
          last_synced_at: scrapeResult.success ? new Date().toISOString() : existingAccount.last_synced_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, account: data as InstagramAccount };
    }

    // Insert new account
    const { data, error } = await supabase
      .from('instagram_accounts')
      .insert({
        user_id: userId,
        username: cleanUsername,
        profile_url: profileUrl,
        display_name: scrapeResult.data?.displayName || null,
        profile_image_url: scrapeResult.data?.profileImageUrl || null,
        followers_count: scrapeResult.data?.followersCount || 0,
        following_count: scrapeResult.data?.followingCount || 0,
        posts_count: scrapeResult.data?.postsCount || 0,
        bio: scrapeResult.data?.bio || null,
        last_synced_at: scrapeResult.success ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // If we got posts from scraping, insert them too
    if (scrapeResult.data?.posts && scrapeResult.data.posts.length > 0) {
      const postsToInsert = scrapeResult.data.posts.map(post => ({
        account_id: data.id,
        post_url: post.postUrl,
        post_type: post.type,
        thumbnail_url: post.thumbnailUrl || null,
        caption: post.caption || null,
        likes_count: post.likesCount,
        comments_count: post.commentsCount,
        views_count: post.viewsCount,
      }));

      await supabase.from('instagram_posts').insert(postsToInsert);
    }

    return { success: true, account: data as InstagramAccount };
  },

  // Get all accounts for a user
  async getAccounts(userId: string): Promise<InstagramAccount[]> {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }

    return data as InstagramAccount[];
  },

  // Get all accounts (for admins)
  async getAllAccounts(): Promise<InstagramAccount[]> {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all accounts:', error);
      return [];
    }

    return data as InstagramAccount[];
  },

  // Get posts for an account
  async getPosts(accountId: string): Promise<InstagramPost[]> {
    const { data, error } = await supabase
      .from('instagram_posts')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    return data as InstagramPost[];
  },

  // Sync an account (re-scrape and update)
  async syncAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    // Get the account
    const { data: account, error: fetchError } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return { success: false, error: 'Account not found' };
    }

    // Scrape the profile
    const scrapeResult = await this.scrapeProfile(account.profile_url);
    
    if (!scrapeResult.success) {
      return { success: false, error: scrapeResult.error };
    }

    // Record metrics history before updating
    await supabase.from('instagram_metrics_history').insert({
      account_id: accountId,
      followers_count: account.followers_count,
      likes_count: 0,
      comments_count: 0,
      views_count: 0,
    });

    // Update the account
    const { error: updateError } = await supabase
      .from('instagram_accounts')
      .update({
        display_name: scrapeResult.data?.displayName || account.display_name,
        profile_image_url: scrapeResult.data?.profileImageUrl || account.profile_image_url,
        followers_count: scrapeResult.data?.followersCount || account.followers_count,
        following_count: scrapeResult.data?.followingCount || account.following_count,
        posts_count: scrapeResult.data?.postsCount || account.posts_count,
        bio: scrapeResult.data?.bio || account.bio,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update or insert posts
    if (scrapeResult.data?.posts) {
      for (const post of scrapeResult.data.posts) {
        await supabase
          .from('instagram_posts')
          .upsert({
            account_id: accountId,
            post_url: post.postUrl,
            post_type: post.type,
            thumbnail_url: post.thumbnailUrl || null,
            caption: post.caption || null,
            likes_count: post.likesCount,
            comments_count: post.commentsCount,
            views_count: post.viewsCount,
          }, {
            onConflict: 'post_url',
          });
      }
    }

    return { success: true };
  },

  // Delete an account
  async deleteAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('instagram_accounts')
      .update({ is_active: false })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Get metrics summary for all accounts
  async getMetricsSummary(userId?: string): Promise<{
    totalFollowers: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    accountsCount: number;
  }> {
    let query = supabase
      .from('instagram_accounts')
      .select('followers_count')
      .eq('is_active', true);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: accounts } = await query;

    let postsQuery = supabase
      .from('instagram_posts')
      .select('likes_count, comments_count, views_count, account_id');

    const { data: posts } = await postsQuery;

    const totalFollowers = accounts?.reduce((sum, acc) => sum + (acc.followers_count || 0), 0) || 0;
    const totalLikes = posts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;
    const totalComments = posts?.reduce((sum, post) => sum + (post.comments_count || 0), 0) || 0;
    const totalViews = posts?.reduce((sum, post) => sum + (post.views_count || 0), 0) || 0;

    return {
      totalFollowers,
      totalLikes,
      totalComments,
      totalViews,
      accountsCount: accounts?.length || 0,
    };
  },
};
