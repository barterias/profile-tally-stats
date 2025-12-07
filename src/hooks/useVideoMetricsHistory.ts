import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MetricsHistoryPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

interface UseVideoMetricsHistoryResult {
  loading: boolean;
  data: MetricsHistoryPoint[];
  refresh: () => void;
}

export function useVideoMetricsHistory(
  campaignId: string | null,
  days: number = 7
): UseVideoMetricsHistoryResult {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricsHistoryPoint[]>([]);

  const fetchHistory = async () => {
    if (!campaignId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch data from campaign_videos and aggregate by date
      const { data: videosData } = await supabase
        .from("campaign_videos")
        .select("views, likes, comments, shares, submitted_at")
        .eq("campaign_id", campaignId);

      // Aggregate by date from submissions
      const dateMap = new Map<string, MetricsHistoryPoint>();
      
      (videosData || []).forEach((item) => {
        const date = item.submitted_at.split("T")[0];
        const existing = dateMap.get(date);
        if (existing) {
          dateMap.set(date, {
            date,
            views: existing.views + (Number(item.views) || 0),
            likes: existing.likes + (Number(item.likes) || 0),
            comments: existing.comments + (Number(item.comments) || 0),
            shares: existing.shares + (Number(item.shares) || 0),
          });
        } else {
          dateMap.set(date, {
            date,
            views: Number(item.views) || 0,
            likes: Number(item.likes) || 0,
            comments: Number(item.comments) || 0,
            shares: Number(item.shares) || 0,
          });
        }
      });

      // Fill in missing dates with zeros
      const result: MetricsHistoryPoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const existing = dateMap.get(dateStr);
        result.push(existing || {
          date: dateStr,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
        });
      }

      setData(result);
    } catch (error) {
      console.error("Error fetching metrics history:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [campaignId, days]);

  return { loading, data, refresh: fetchHistory };
}
