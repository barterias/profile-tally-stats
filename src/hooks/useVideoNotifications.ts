import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useVideoNotifications() {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) return;

    console.log("Setting up realtime video notifications for admin...");

    const channel = supabase
      .channel('video-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_videos'
        },
        async (payload) => {
          console.log("New video submitted:", payload);
          
          const newVideo = payload.new as {
            id: string;
            campaign_id: string;
            platform: string;
            video_link: string;
            submitted_by: string | null;
          };

          // Fetch campaign name
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('name')
            .eq('id', newVideo.campaign_id)
            .single();

          // Fetch submitter username if exists
          let username = "Desconhecido";
          if (newVideo.submitted_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', newVideo.submitted_by)
              .single();
            
            if (profile) {
              username = profile.username;
            }
          }

          const platformIcon = {
            tiktok: "🎵",
            instagram: "📸",
            youtube: "▶️"
          }[newVideo.platform] || "🎬";

          toast.info(
            `${platformIcon} Novo vídeo enviado!`,
            {
              description: `${username} enviou um vídeo para ${campaign?.name || 'uma campanha'}`,
              duration: 5000,
              action: {
                label: "Ver",
                onClick: () => window.open(newVideo.video_link, "_blank")
              }
            }
          );
        }
      )
      .subscribe((status) => {
        console.log("Video notifications subscription status:", status);
      });

    return () => {
      console.log("Cleaning up video notifications channel");
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);
}
