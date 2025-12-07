import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { RankingItem } from "@/types/campaign";

interface PaymentConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: RankingItem;
  amount: number;
  campaignId: string;
  onSuccess: () => void;
}

export function PaymentConfirmModal({
  open,
  onOpenChange,
  user,
  amount,
  campaignId,
  onSuccess,
}: PaymentConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1. Add to user wallet
      const { data: wallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (wallet) {
        // Update existing wallet
        await supabase
          .from('user_wallets')
          .update({
            available_balance: Number(wallet.available_balance) + amount,
            total_earned: Number(wallet.total_earned) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.user_id);
      } else {
        // Create new wallet
        await supabase
          .from('user_wallets')
          .insert({
            user_id: user.user_id,
            available_balance: amount,
            total_earned: amount,
            pending_balance: 0,
            total_withdrawn: 0,
          });
      }

      // 2. Create transaction record
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.user_id,
          amount: amount,
          type: 'earning',
          description: `Ganhos da campanha - ${notes || 'Pagamento de ranking'}`,
          reference_id: campaignId,
        });

      // 3. Create earnings record
      await supabase
        .from('clipper_earnings_estimates')
        .insert({
          user_id: user.user_id,
          campaign_id: campaignId,
          views_count: user.total_views,
          estimated_earnings: amount,
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
        });

      toast.success(`Pagamento de ${formatCurrency(amount)} realizado para ${user.username}!`);
      onSuccess();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-400" />
            Confirmar Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30">
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.username}</p>
              <p className="text-sm text-muted-foreground">
                Posição #{user.rank_position}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Valor a ser pago</p>
            <p className="text-3xl font-bold text-green-400 flex items-center justify-center gap-2">
              <DollarSign className="h-8 w-8" />
              {formatCurrency(amount)}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione uma nota sobre este pagamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background/50 border-border/50"
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400">
              Este valor será adicionado ao saldo disponível do clipador. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>Processando...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
