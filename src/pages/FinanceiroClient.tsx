import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { PayoutsTable } from "@/components/Tables/PayoutsTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Wallet, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface PayoutRequest {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  amount: number;
  status: string;
  pix_key?: string;
  pix_type?: string;
  requested_at: string;
  available_balance?: number;
  total_earned?: number;
  total_withdrawn?: number;
}

function FinanceiroClientContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [allPayouts, setAllPayouts] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    totalPending: 0,
    totalPaid: 0
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get campaigns owned by this client
      const { data: ownedCampaigns, error: ownerError } = await supabase
        .from("campaign_owners")
        .select("campaign_id")
        .eq("user_id", user?.id);

      if (ownerError) throw ownerError;

      if (!ownedCampaigns || ownedCampaigns.length === 0) {
        setAllPayouts([]);
        setLoading(false);
        return;
      }

      const campaignIds = ownedCampaigns.map(co => co.campaign_id);

      // Get videos from these campaigns to find clipper user_ids
      const { data: videos, error: videosError } = await supabase
        .from("campaign_videos")
        .select("submitted_by")
        .in("campaign_id", campaignIds);

      if (videosError) throw videosError;

      const clipperIds = [...new Set(videos?.map(v => v.submitted_by).filter(Boolean))];

      if (clipperIds.length === 0) {
        setAllPayouts([]);
        setLoading(false);
        return;
      }

      // Get payout requests from these clippers
      const { data, error } = await supabase
        .from('payout_admin_view')
        .select('*')
        .in('user_id', clipperIds)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      setAllPayouts(data || []);

      // Calculate stats
      const pending = data?.filter(p => p.status === 'pending') || [];
      const approved = data?.filter(p => p.status === 'approved') || [];
      const paid = data?.filter(p => p.status === 'paid') || [];
      const rejected = data?.filter(p => p.status === 'rejected') || [];

      setStats({
        pending: pending.length,
        approved: approved.length,
        paid: paid.length,
        rejected: rejected.length,
        totalPending: pending.reduce((acc, p) => acc + Number(p.amount || 0), 0),
        totalPaid: paid.reduce((acc, p) => acc + Number(p.amount || 0), 0)
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t("msg.error_loading"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPayoutsByStatus = (status: string) => {
    return allPayouts.filter(p => p.status === status);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {t("financial.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("financial.manage_withdrawals")}</p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title={t("financial.pending_withdrawals")}
            value={stats.pending}
            icon={Clock}
            glowColor="orange"
            subtitle={formatCurrency(stats.totalPending)}
          />
          <MetricCardGlow
            title={t("financial.awaiting_payment")}
            value={stats.approved}
            icon={CheckCircle}
            glowColor="blue"
          />
          <MetricCardGlow
            title={t("payments.total_paid")}
            value={formatCurrency(stats.totalPaid)}
            icon={DollarSign}
            glowColor="green"
            subtitle={`${stats.paid} ${t("tabs.paid").toLowerCase()}`}
          />
          <MetricCardGlow
            title={t("tabs.rejected")}
            value={stats.rejected}
            icon={XCircle}
            glowColor="purple"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="pending">
              {t("tabs.pending")}
              {stats.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              {t("tabs.approved")}
              {stats.approved > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                  {stats.approved}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">{t("tabs.paid")}</TabsTrigger>
            <TabsTrigger value="rejected">{t("tabs.rejected")}</TabsTrigger>
            <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">{t("financial.pending_withdrawals")}</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('pending')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="approved">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">{t("financial.withdrawals_approved")}</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('approved')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="paid">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">{t("financial.withdrawals_paid")}</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('paid')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="rejected">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">{t("financial.withdrawals_rejected")}</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('rejected')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="all">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">{t("financial.all_withdrawals")}</h3>
              <PayoutsTable 
                payouts={allPayouts} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function FinanceiroClient() {
  return (
    <ProtectedRoute>
      <FinanceiroClientContent />
    </ProtectedRoute>
  );
}
