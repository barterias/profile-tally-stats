import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the list of user IDs who submitted videos to campaigns owned by the current client.
 * Used to filter Account Analytics so clients only see relevant accounts.
 */
export function useClientCampaignUserIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client-campaign-user-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Get campaigns owned by this client
      const { data: ownership } = await supabase
        .from("campaign_owners")
        .select("campaign_id")
        .eq("user_id", user.id);

      const campaignIds = (ownership || []).map((o) => o.campaign_id);
      if (campaignIds.length === 0) return [];

      // 2. Get distinct user IDs who submitted videos to these campaigns
      const { data: videos } = await supabase
        .from("campaign_videos")
        .select("submitted_by")
        .in("campaign_id", campaignIds)
        .not("submitted_by", "is", null);

      const userIds = [...new Set((videos || []).map((v) => v.submitted_by).filter(Boolean))] as string[];
      return userIds;
    },
    enabled: !!user?.id,
  });
}
