import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PrizeConfig {
  position: number;
  prize_amount: number;
}

export function useCompetitionPrizes(campaignId: string | null) {
  const [loading, setLoading] = useState(true);
  const [prizes, setPrizes] = useState<PrizeConfig[]>([]);

  const fetchPrizes = useCallback(async () => {
    if (!campaignId) {
      setPrizes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('competition_prizes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true });

      if (error) throw error;
      
      setPrizes(data?.map(p => ({
        position: p.position,
        prize_amount: Number(p.prize_amount || 0),
      })) || []);
    } catch (error) {
      console.error('Error fetching prizes:', error);
      setPrizes([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const savePrizes = async (newPrizes: PrizeConfig[]) => {
    if (!campaignId) return false;

    try {
      // Delete existing prizes
      await supabase
        .from('competition_prizes')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new prizes
      if (newPrizes.length > 0) {
        const { error } = await supabase
          .from('competition_prizes')
          .insert(
            newPrizes.map(p => ({
              campaign_id: campaignId,
              position: p.position,
              prize_amount: p.prize_amount,
            }))
          );

        if (error) throw error;
      }

      await fetchPrizes();
      return true;
    } catch (error) {
      console.error('Error saving prizes:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  return {
    loading,
    prizes,
    savePrizes,
    refresh: fetchPrizes,
  };
}
