export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_owners: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_owners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_owners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_owners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_owners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          campaign_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          campaign_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_payment_records: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          period_date: string
          period_type: string
          position: number | null
          status: string
          updated_at: string
          user_id: string
          videos_count: number | null
          views_count: number | null
        }
        Insert: {
          amount?: number
          campaign_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_date: string
          period_type: string
          position?: number | null
          status?: string
          updated_at?: string
          user_id: string
          videos_count?: number | null
          views_count?: number | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_date?: string
          period_type?: string
          position?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          videos_count?: number | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_payment_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_payment_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_payment_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_payment_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_videos: {
        Row: {
          campaign_id: string
          comments: number | null
          id: string
          likes: number | null
          platform: string
          shares: number | null
          submitted_at: string
          submitted_by: string | null
          verified: boolean
          video_link: string
          views: number | null
        }
        Insert: {
          campaign_id: string
          comments?: number | null
          id?: string
          likes?: number | null
          platform: string
          shares?: number | null
          submitted_at?: string
          submitted_by?: string | null
          verified?: boolean
          video_link: string
          views?: number | null
        }
        Update: {
          campaign_id?: string
          comments?: number | null
          id?: string
          likes?: number | null
          platform?: string
          shares?: number | null
          submitted_at?: string
          submitted_by?: string | null
          verified?: boolean
          video_link?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string | null
          competition_type: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          max_paid_views: number | null
          min_views: number | null
          name: string
          payment_rate: number | null
          platform: string
          platforms: string[] | null
          prize_description: string | null
          prize_pool: number | null
          rules: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          campaign_type?: string | null
          competition_type?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_paid_views?: number | null
          min_views?: number | null
          name: string
          payment_rate?: number | null
          platform: string
          platforms?: string[] | null
          prize_description?: string | null
          prize_pool?: number | null
          rules?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          campaign_type?: string | null
          competition_type?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_paid_views?: number | null
          min_views?: number | null
          name?: string
          payment_rate?: number | null
          platform?: string
          platforms?: string[] | null
          prize_description?: string | null
          prize_pool?: number | null
          rules?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      clipper_earnings_estimates: {
        Row: {
          campaign_id: string
          created_at: string
          estimated_earnings: number | null
          id: string
          period_end: string | null
          period_start: string | null
          updated_at: string
          user_id: string
          video_id: string | null
          views_count: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          estimated_earnings?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          user_id: string
          video_id?: string | null
          views_count?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          estimated_earnings?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clipper_earnings_estimates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "clipper_earnings_estimates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clipper_earnings_estimates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clipper_earnings_estimates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_prizes: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          position: number
          prize_amount: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          position: number
          prize_amount?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          position?: number
          prize_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "competition_prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          platform: string
          profile_url: string | null
          total_videos: number | null
          total_views: number | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          platform: string
          profile_url?: string | null
          total_videos?: number | null
          total_views?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          platform?: string
          profile_url?: string | null
          total_videos?: number | null
          total_views?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      daily_rankings: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          position: number | null
          ranking_date: string
          user_id: string
          videos_today: number | null
          views_today: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          position?: number | null
          ranking_date?: string
          user_id: string
          videos_today?: number | null
          views_today?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          position?: number | null
          ranking_date?: string
          user_id?: string
          videos_today?: number | null
          views_today?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "daily_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_views: {
        Row: {
          created_at: string
          date: string
          id: string
          video_id: string
          views: number
          views_gained: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          video_id: string
          views: number
          views_gained?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          video_id?: string
          views?: number
          views_gained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_rankings: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          position: number | null
          ranking_month: string
          total_videos: number | null
          total_views: number | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          position?: number | null
          ranking_month: string
          total_videos?: number | null
          total_views?: number | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          position?: number | null
          ranking_month?: string
          total_videos?: number | null
          total_views?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "monthly_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_rankings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          id: string
          paid_at: string | null
          pix_key: string | null
          pix_type: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          paid_at?: string | null
          pix_key?: string | null
          pix_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          paid_at?: string | null
          pix_key?: string | null
          pix_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payouts_ledger: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          payout_request_id: string | null
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          payout_request_id?: string | null
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          payout_request_id?: string | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_ledger_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_ledger_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string
          warning: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username: string
          warning?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
          warning?: string | null
        }
        Relationships: []
      }
      social_videos: {
        Row: {
          comments: number | null
          creator_avatar: string | null
          duration: number | null
          id: string
          inserted_at: string
          likes: number | null
          link: string
          music_title: string | null
          platform: string
          shares: number | null
          thumbnail: string | null
          title: string
          updated_at: string
          video_url: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          creator_avatar?: string | null
          duration?: number | null
          id?: string
          inserted_at?: string
          likes?: number | null
          link: string
          music_title?: string | null
          platform: string
          shares?: number | null
          thumbnail?: string | null
          title: string
          updated_at?: string
          video_url: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          creator_avatar?: string | null
          duration?: number | null
          id?: string
          inserted_at?: string
          likes?: number | null
          link?: string
          music_title?: string | null
          platform?: string
          shares?: number | null
          thumbnail?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          views?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          available_balance: number
          created_at: string
          id: string
          pending_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_metrics_history: {
        Row: {
          comments: number | null
          created_at: string
          id: string
          likes: number | null
          recorded_at: string
          shares: number | null
          video_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          recorded_at?: string
          shares?: number | null
          video_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          recorded_at?: string
          shares?: number | null
          video_id?: string
          views?: number | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          comments: number | null
          created_at: string
          creator_id: string
          hashtags: string[] | null
          id: string
          likes: number | null
          platform: string
          posted_at: string | null
          shares: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          creator_id: string
          hashtags?: string[] | null
          id?: string
          likes?: number | null
          platform: string
          posted_at?: string | null
          shares?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          creator_id?: string
          hashtags?: string[] | null
          id?: string
          likes?: number | null
          platform?: string
          posted_at?: string | null
          shares?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      approved_campaign_participants: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          campaign_id: string | null
          campaign_name: string | null
          id: string | null
          status: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_platform_distribution: {
        Row: {
          campaign_id: string | null
          platform: string | null
          total_likes: number | null
          total_views: number | null
          video_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats_view: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          campaign_type: string | null
          competition_type: string | null
          is_active: boolean | null
          payment_rate: number | null
          prize_pool: number | null
          total_clippers: number | null
          total_comments: number | null
          total_likes: number | null
          total_shares: number | null
          total_videos: number | null
          total_views: number | null
        }
        Relationships: []
      }
      campaign_summary: {
        Row: {
          end_date: string | null
          engagement_rate: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          start_date: string | null
          total_clippers: number | null
          total_comments: number | null
          total_likes: number | null
          total_posts: number | null
          total_shares: number | null
          total_views: number | null
        }
        Relationships: []
      }
      payout_admin_view: {
        Row: {
          amount: number | null
          available_balance: number | null
          avatar_url: string | null
          id: string | null
          paid_at: string | null
          pix_key: string | null
          pix_type: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string | null
          status: string | null
          total_earned: number | null
          total_withdrawn: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      pending_campaign_participants: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          campaign_id: string | null
          campaign_name: string | null
          id: string | null
          status: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_views: {
        Row: {
          avatar_url: string | null
          campaign_id: string | null
          campaign_name: string | null
          rank_position: number | null
          total_likes: number | null
          total_videos: number | null
          total_views: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_available_campaigns: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          owner_id: string | null
          participant_id: string | null
          participation_status: string | null
          platform: string | null
          platforms: string[] | null
          prize_description: string | null
          rules: string | null
          start_date: string | null
          updated_at: string | null
          user_status: string | null
        }
        Relationships: []
      }
      user_campaign_earnings: {
        Row: {
          avatar_url: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_type: string | null
          estimated_earnings: number | null
          payment_rate: number | null
          total_views: number | null
          user_id: string | null
          username: string | null
          video_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats_view"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_videos_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "user_available_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallet_view: {
        Row: {
          available_balance: number | null
          created_at: string | null
          id: string | null
          pending_balance: number | null
          pending_requests: number | null
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_payout: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_mark_payout_paid: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_reject_payout: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      approve_participant: {
        Args: { p_participant_id: string }
        Returns: undefined
      }
      approve_user: { Args: { pending_id: string }; Returns: undefined }
      get_admin_users_view: {
        Args: never
        Returns: {
          date: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          username: string
          warning: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_participant: {
        Args: { p_participant_id: string }
        Returns: undefined
      }
      reject_user: { Args: { pending_id: string }; Returns: undefined }
      request_campaign_participation: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      request_payout: {
        Args: { p_amount: number; p_pix_key: string; p_pix_type: string }
        Returns: string
      }
      submit_video_for_campaign: {
        Args: {
          p_campaign_id: string
          p_platform: string
          p_video_link: string
        }
        Returns: string
      }
      update_role: {
        Args: { p_new_role: string; p_user_id: string }
        Returns: undefined
      }
      update_warning: {
        Args: { new_warning: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "client"],
    },
  },
} as const
