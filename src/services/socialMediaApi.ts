// Social Media API Service
// Configure this to connect to your Python FastAPI backend

import type { 
  SocialAccount, 
  SocialMetrics, 
  MetricsSummary, 
  SocialAccountWithMetrics,
  ConnectAccountRequest,
  ConnectAccountResponse,
  SyncResponse,
  DashboardSettings,
  ChartDataPoint,
  SocialPlatform
} from '@/types/socialMedia';

// Base URL for your Python FastAPI backend
// Update this to your actual backend URL when deployed
const API_BASE_URL = import.meta.env.VITE_SOCIAL_API_URL || 'http://localhost:8000/api/v1';

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('social_auth_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// Authentication
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string, name: string) => {
    return apiRequest<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  logout: async () => {
    localStorage.removeItem('social_auth_token');
    return apiRequest('/auth/logout', { method: 'POST' });
  },

  getCurrentUser: async () => {
    return apiRequest<{ id: string; email: string; name: string }>('/auth/me');
  },
};

// Social Accounts
export const accountsApi = {
  getAll: async (): Promise<SocialAccountWithMetrics[]> => {
    return apiRequest<SocialAccountWithMetrics[]>('/accounts');
  },

  getById: async (accountId: string): Promise<SocialAccountWithMetrics> => {
    return apiRequest<SocialAccountWithMetrics>(`/accounts/${accountId}`);
  },

  connect: async (request: ConnectAccountRequest): Promise<ConnectAccountResponse> => {
    return apiRequest<ConnectAccountResponse>('/accounts/connect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  disconnect: async (accountId: string): Promise<void> => {
    return apiRequest(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },

  getOAuthCallback: async (platform: SocialPlatform, code: string, state: string) => {
    return apiRequest<SocialAccount>(`/accounts/oauth/callback/${platform}`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  },
};

// Metrics
export const metricsApi = {
  getSummary: async (): Promise<MetricsSummary> => {
    return apiRequest<MetricsSummary>('/metrics/summary');
  },

  getByAccount: async (accountId: string, days: number = 30): Promise<SocialMetrics[]> => {
    return apiRequest<SocialMetrics[]>(`/metrics/account/${accountId}?days=${days}`);
  },

  getHistory: async (days: number = 30): Promise<ChartDataPoint[]> => {
    return apiRequest<ChartDataPoint[]>(`/metrics/history?days=${days}`);
  },

  getByPlatform: async (platform: SocialPlatform): Promise<SocialMetrics[]> => {
    return apiRequest<SocialMetrics[]>(`/metrics/platform/${platform}`);
  },
};

// Sync
export const syncApi = {
  triggerSync: async (): Promise<SyncResponse> => {
    return apiRequest<SyncResponse>('/sync/trigger', {
      method: 'POST',
    });
  },

  getSyncStatus: async (): Promise<{ is_syncing: boolean; last_synced_at: string }> => {
    return apiRequest('/sync/status');
  },
};

// Settings
export const settingsApi = {
  get: async (): Promise<DashboardSettings> => {
    return apiRequest<DashboardSettings>('/settings');
  },

  update: async (settings: Partial<DashboardSettings>): Promise<DashboardSettings> => {
    return apiRequest<DashboardSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

// Mock data for development (remove when connecting to real API)
export const mockData = {
  accounts: [
    {
      id: '1',
      user_id: 'user1',
      platform: 'tiktok' as SocialPlatform,
      account_name: 'Minha Conta TikTok',
      account_username: '@minhaconta',
      profile_image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tiktok',
      is_connected: true,
      connected_at: '2024-01-15T10:00:00Z',
      last_synced_at: '2024-12-19T02:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-12-19T02:00:00Z',
      metrics: {
        id: 'm1',
        account_id: '1',
        platform: 'tiktok' as SocialPlatform,
        followers: 125000,
        views: 2500000,
        likes: 180000,
        comments: 12500,
        shares: 8500,
        engagement_rate: 4.2,
        recorded_at: '2024-12-19T02:00:00Z',
        created_at: '2024-12-19T02:00:00Z',
      },
    },
    {
      id: '2',
      user_id: 'user1',
      platform: 'instagram' as SocialPlatform,
      account_name: 'Minha Conta Instagram',
      account_username: '@minhaconta_ig',
      profile_image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=instagram',
      is_connected: true,
      connected_at: '2024-02-01T14:30:00Z',
      last_synced_at: '2024-12-19T02:00:00Z',
      created_at: '2024-02-01T14:30:00Z',
      updated_at: '2024-12-19T02:00:00Z',
      metrics: {
        id: 'm2',
        account_id: '2',
        platform: 'instagram' as SocialPlatform,
        followers: 85000,
        views: 1200000,
        likes: 95000,
        comments: 7800,
        shares: 3200,
        engagement_rate: 3.8,
        recorded_at: '2024-12-19T02:00:00Z',
        created_at: '2024-12-19T02:00:00Z',
      },
    },
    {
      id: '3',
      user_id: 'user1',
      platform: 'youtube' as SocialPlatform,
      account_name: 'Meu Canal YouTube',
      account_username: '@meucanal',
      profile_image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=youtube',
      is_connected: true,
      connected_at: '2024-03-10T09:15:00Z',
      last_synced_at: '2024-12-19T02:00:00Z',
      created_at: '2024-03-10T09:15:00Z',
      updated_at: '2024-12-19T02:00:00Z',
      metrics: {
        id: 'm3',
        account_id: '3',
        platform: 'youtube' as SocialPlatform,
        followers: 45000,
        views: 890000,
        likes: 42000,
        comments: 3500,
        shares: 1800,
        engagement_rate: 5.1,
        recorded_at: '2024-12-19T02:00:00Z',
        created_at: '2024-12-19T02:00:00Z',
      },
    },
  ] as SocialAccountWithMetrics[],

  summary: {
    total_followers: 255000,
    total_views_7d: 4590000,
    total_likes_7d: 317000,
    total_comments_7d: 23800,
    avg_engagement_rate: 4.37,
    growth_percentage: 12.5,
    accounts_count: 3,
  } as MetricsSummary,

  chartData: [
    { date: '2024-12-13', followers: 248000, views: 620000, engagement: 4.1 },
    { date: '2024-12-14', followers: 249500, views: 650000, engagement: 4.2 },
    { date: '2024-12-15', followers: 251000, views: 680000, engagement: 4.3 },
    { date: '2024-12-16', followers: 252500, views: 640000, engagement: 4.2 },
    { date: '2024-12-17', followers: 253500, views: 710000, engagement: 4.5 },
    { date: '2024-12-18', followers: 254200, views: 690000, engagement: 4.3 },
    { date: '2024-12-19', followers: 255000, views: 600000, engagement: 4.4 },
  ] as ChartDataPoint[],
};
