import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { PayoutsTable } from "@/components/Tables/PayoutsTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
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

function FinanceiroAdminContent() {
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payout_admin_view')
        .select('*')
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
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
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
              Gestão Financeira
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie solicitações de saque</p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Saques Pendentes"
            value={stats.pending}
            icon={Clock}
            glowColor="orange"
            subtitle={formatCurrency(stats.totalPending)}
          />
          <MetricCardGlow
            title="Aguardando Pagamento"
            value={stats.approved}
            icon={CheckCircle}
            glowColor="blue"
          />
          <MetricCardGlow
            title="Total Pago"
            value={formatCurrency(stats.totalPaid)}
            icon={DollarSign}
            glowColor="green"
            subtitle={`${stats.paid} saques`}
          />
          <MetricCardGlow
            title="Rejeitados"
            value={stats.rejected}
            icon={XCircle}
            glowColor="purple"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="pending">
              Pendentes
              {stats.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovados
              {stats.approved > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                  {stats.approved}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">Pagos</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Saques Aguardando Aprovação</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('pending')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="approved">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Saques Aprovados - Aguardando Pagamento</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('approved')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="paid">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Saques Pagos</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('paid')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="rejected">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Saques Rejeitados</h3>
              <PayoutsTable 
                payouts={getPayoutsByStatus('rejected')} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="all">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Todos os Saques</h3>
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

export default function FinanceiroAdmin() {
  return (
    <ProtectedRoute requireAdmin>
      <FinanceiroAdminContent />
    </ProtectedRoute>
  );
}
