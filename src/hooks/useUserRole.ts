import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'client' | 'user';

interface UserRoleData {
  role: UserRole;
  isAdmin: boolean;
  isClient: boolean;
  isClipper: boolean;
  loading: boolean;
  ownedCampaigns: string[];
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [ownedCampaigns, setOwnedCampaigns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData?.role) {
          setRole(roleData.role as UserRole);
        }

        // Check if user owns any campaigns (client role)
        const { data: ownerData } = await supabase
          .from('campaign_owners')
          .select('campaign_id')
          .eq('user_id', user.id);

        if (ownerData && ownerData.length > 0) {
          setOwnedCampaigns(ownerData.map(o => o.campaign_id));
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    isAdmin: role === 'admin',
    isClient: ownedCampaigns.length > 0 || role === 'client',
    isClipper: role === 'user',
    loading,
    ownedCampaigns
  };
}
