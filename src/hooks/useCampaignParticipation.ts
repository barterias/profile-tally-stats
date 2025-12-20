import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useUserCampaignParticipations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-campaign-participations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('campaign_participants')
        .select('campaign_id, status')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useRequestCampaignParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.rpc('request_campaign_participation', {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Inscrição enviada! Aguarde aprovação.');
      queryClient.invalidateQueries({ queryKey: ['user-campaign-participations'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-participants'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Você já está inscrito nesta campanha');
      } else {
        toast.error(error.message || 'Erro ao se inscrever');
      }
    },
  });
}
