import { useState, useEffect } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCampaignPayments } from "@/hooks/useCampaignPayments";
import { PaymentTable } from "@/components/Payments/PaymentTable";
import { PaymentSummaryCard } from "@/components/Payments/PaymentSummaryCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarIcon, 
  DollarSign, 
  Download, 
  Loader2,
  CheckCircle2,
  RefreshCcw
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
}

function PaymentManagementContent() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'daily' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const { 
    clippers, 
    campaignInfo, 
    loading, 
    totalPending, 
    totalPaid,
    processPayment,
    processAllPayments,
    refetch
  } = useCampaignPayments(selectedCampaignId, periodType, selectedDate);

  // Fetch campaigns based on role
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        let query = supabase.from('campaigns').select('id, name, campaign_type');
        
        if (role === 'client' && user) {
          // Get only campaigns owned by this client
          const { data: ownedCampaigns } = await supabase
            .from('campaign_owners')
            .select('campaign_id')
            .eq('user_id', user.id);
          
          const campaignIds = (ownedCampaigns || []).map(c => c.campaign_id);
          if (campaignIds.length > 0) {
            query = query.in('id', campaignIds);
          } else {
            setCampaigns([]);
            setLoadingCampaigns(false);
            return;
          }
        }

        const { data, error } = await query.order('name');
        
        if (error) throw error;
        setCampaigns(data || []);
        
        if (data && data.length > 0) {
          setSelectedCampaignId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast.error('Erro ao carregar campanhas');
      } finally {
        setLoadingCampaigns(false);
      }
    };

    if (user && role) {
      fetchCampaigns();
    }
  }, [user, role]);

  const handlePayAllPending = async () => {
    const unpaidCount = clippers.filter(c => c.payment_status !== 'paid' && c.calculated_amount > 0).length;
    if (unpaidCount === 0) {
      toast.info('Não há pagamentos pendentes');
      return;
    }

    if (!confirm(`Confirma o pagamento de ${unpaidCount} clipadores?`)) return;

    await processAllPayments(`Pagamento em lote - ${format(selectedDate, 'MMMM yyyy', { locale: ptBR })}`);
    toast.success(`${unpaidCount} pagamentos processados com sucesso!`);
  };

  const handleExportCSV = () => {
    const headers = ['Posição', 'Clipador', 'Views', 'Vídeos', 'Valor', 'Status'];
    const rows = clippers.map(c => [
      c.position,
      c.username,
      c.total_views,
      c.total_videos,
      c.calculated_amount.toFixed(2),
      c.payment_status === 'paid' ? 'Pago' : 'Pendente'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos_${format(selectedDate, 'yyyy-MM')}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  const paidClippers = clippers.filter(c => c.payment_status === 'paid').length;

  if (loadingCampaigns) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Gestão de Pagamentos
            </h1>
            <p className="text-muted-foreground">
              Gerencie pagamentos para clipadores das suas campanhas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Campaign Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Campanha</label>
                <Select 
                  value={selectedCampaignId || ''} 
                  onValueChange={setSelectedCampaignId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Período</label>
                <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as 'daily' | 'monthly')}>
                  <TabsList className="w-full">
                    <TabsTrigger value="daily" className="flex-1">Diário</TabsTrigger>
                    <TabsTrigger value="monthly" className="flex-1">Mensal</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Date Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {periodType === 'monthly' ? 'Mês' : 'Data'}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {periodType === 'monthly' 
                        ? format(selectedDate, 'MMMM yyyy', { locale: ptBR })
                        : format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Pay All Button */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  onClick={handlePayAllPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading || totalPending === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Pagar Todos Pendentes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <PaymentSummaryCard
          totalPending={totalPending}
          totalPaid={totalPaid}
          totalClippers={clippers.length}
          paidClippers={paidClippers}
        />

        {/* Campaign Info */}
        {campaignInfo && (
          <Card className="bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium capitalize">
                  {campaignInfo.campaign_type === 'pay_per_view' ? 'Pay Per View' : 
                   campaignInfo.campaign_type === 'competition_daily' ? 'Competição Diária' :
                   campaignInfo.campaign_type === 'competition_monthly' ? 'Competição Mensal' :
                   'Fixo'}
                </span>
                
                {campaignInfo.campaign_type === 'pay_per_view' && (
                  <>
                    <span className="text-muted-foreground ml-4">Taxa:</span>
                    <span className="font-medium">R$ {campaignInfo.payment_rate}/1K views</span>
                    <span className="text-muted-foreground ml-4">Mín. Views:</span>
                    <span className="font-medium">{campaignInfo.min_views.toLocaleString()}</span>
                  </>
                )}
                
                {(campaignInfo.campaign_type === 'competition_daily' || campaignInfo.campaign_type === 'competition_monthly') && (
                  <>
                    <span className="text-muted-foreground ml-4">Premiação:</span>
                    <span className="font-medium">R$ {campaignInfo.prize_pool.toLocaleString()}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking e Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentTable
              clippers={clippers}
              onPayment={processPayment}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function PaymentManagement() {
  return (
    <ProtectedRoute>
      <PaymentManagementContent />
    </ProtectedRoute>
  );
}
