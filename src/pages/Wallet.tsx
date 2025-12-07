import { useState, useEffect } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet as WalletIcon,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface WalletData {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  rejection_reason: string | null;
}

function WalletContent() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setWallet(walletData || { available_balance: 0, pending_balance: 0, total_earned: 0, total_withdrawn: 0 });

      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(txData || []);

      const { data: payoutData } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });
      setPayoutRequests(payoutData || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleWithdraw = async () => {
    if (!user || !wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > wallet.available_balance) {
      toast.error('Valor inválido ou saldo insuficiente');
      return;
    }
    if (!pixKey || !pixType) {
      toast.error('Informe a chave PIX');
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('request_payout', { p_amount: amount, p_pix_key: pixKey, p_pix_type: pixType });
      if (error) throw error;
      toast.success('Saque solicitado!');
      setWithdrawModalOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar saque');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><WalletIcon className="h-6 w-6 text-primary" />Minha Carteira</h1>
          <Button onClick={() => setWithdrawModalOpen(true)} className="bg-green-600 hover:bg-green-700" disabled={!wallet || wallet.available_balance <= 0}>
            <ArrowUpRight className="h-4 w-4 mr-2" />Solicitar Saque
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-4"><DollarSign className="h-5 w-5 text-green-400" /><p className="text-sm text-muted-foreground">Disponível</p><p className="text-2xl font-bold text-green-400">{formatCurrency(wallet?.available_balance || 0)}</p></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30">
            <CardContent className="p-4"><Clock className="h-5 w-5 text-yellow-400" /><p className="text-sm text-muted-foreground">Pendente</p><p className="text-2xl font-bold text-yellow-400">{formatCurrency(wallet?.pending_balance || 0)}</p></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30">
            <CardContent className="p-4"><TrendingUp className="h-5 w-5 text-blue-400" /><p className="text-sm text-muted-foreground">Total Ganho</p><p className="text-2xl font-bold text-blue-400">{formatCurrency(wallet?.total_earned || 0)}</p></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-4"><ArrowUpRight className="h-5 w-5 text-purple-400" /><p className="text-sm text-muted-foreground">Total Sacado</p><p className="text-2xl font-bold text-purple-400">{formatCurrency(wallet?.total_withdrawn || 0)}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Transações</CardTitle></CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.type === 'earning' ? <ArrowDownLeft className="h-4 w-4 text-green-400" /> : <ArrowUpRight className="h-4 w-4 text-red-400" />}</TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell>{format(new Date(tx.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'earning' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="text-center py-8 text-muted-foreground">Nenhuma transação</p>}
          </CardContent>
        </Card>

        <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar Saque</DialogTitle><DialogDescription>Informe o valor e a chave PIX.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <p className="text-green-400 font-bold">Disponível: {formatCurrency(wallet?.available_balance || 0)}</p>
              <Input type="number" placeholder="Valor" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
              <Select value={pixType} onValueChange={setPixType}><SelectTrigger><SelectValue placeholder="Tipo PIX" /></SelectTrigger><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="random">Chave Aleatória</SelectItem></SelectContent></Select>
              <Input placeholder="Chave PIX" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleWithdraw} disabled={processing} className="bg-green-600">{processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Solicitar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

export default function Wallet() {
  return <ProtectedRoute><WalletContent /></ProtectedRoute>;
}
