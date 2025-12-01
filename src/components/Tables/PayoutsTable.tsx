import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Check, X, Loader2, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';

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
}

interface PayoutsTableProps {
  payouts: PayoutRequest[];
  onRefresh?: () => void;
}

export function PayoutsTable({ payouts, onRefresh }: PayoutsTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (requestId: string) => {
    setLoading(requestId);
    try {
      const { error } = await supabase.rpc('admin_approve_payout', { p_request_id: requestId });
      if (error) throw error;
      toast.success('Saque aprovado!');
      onRefresh?.();
    } catch (error: any) {
      toast.error('Erro ao aprovar: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.id) return;
    setLoading(rejectDialog.id);
    try {
      const { error } = await supabase.rpc('admin_reject_payout', { 
        p_request_id: rejectDialog.id,
        p_reason: rejectReason 
      });
      if (error) throw error;
      toast.success('Saque rejeitado.');
      setRejectDialog({ open: false, id: null });
      setRejectReason('');
      onRefresh?.();
    } catch (error: any) {
      toast.error('Erro ao rejeitar: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    setLoading(requestId);
    try {
      const { error } = await supabase.rpc('admin_mark_payout_paid', { p_request_id: requestId });
      if (error) throw error;
      toast.success('Saque marcado como pago!');
      onRefresh?.();
    } catch (error: any) {
      toast.error('Erro ao marcar como pago: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (payouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma solicitação de saque encontrada.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Usuário</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Chave PIX</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={payout.avatar_url} />
                      <AvatarFallback>{payout.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{payout.username}</span>
                      {payout.total_earned && (
                        <p className="text-xs text-muted-foreground">
                          Total ganho: {formatCurrency(payout.total_earned)}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-green-400">
                  {formatCurrency(payout.amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="text-sm">
                    <span className="uppercase text-xs">{payout.pix_type}</span>
                    <p className="truncate max-w-[150px]">{payout.pix_key}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={payout.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(payout.requested_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {payout.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => handleApprove(payout.id)}
                          disabled={loading === payout.id}
                        >
                          {loading === payout.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setRejectDialog({ open: true, id: payout.id })}
                          disabled={loading === payout.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {payout.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => handleMarkPaid(payout.id)}
                        disabled={loading === payout.id}
                      >
                        {loading === payout.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {(payout.status === 'paid' || payout.status === 'rejected') && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, id: open ? rejectDialog.id : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Saque</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do saque.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Motivo da rejeição"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog({ open: false, id: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
