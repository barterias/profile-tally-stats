import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Crown, 
  Medal, 
  Award, 
  Eye, 
  Video, 
  Wallet, 
  CheckCircle2,
  Loader2
} from "lucide-react";
import { ClipperEarning } from "@/hooks/useCampaignPayments";

interface PaymentTableProps {
  clippers: ClipperEarning[];
  onPayment: (userId: string, amount: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export function PaymentTable({ clippers, onPayment, loading }: PaymentTableProps) {
  const [selectedClipper, setSelectedClipper] = useState<ClipperEarning | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-orange-500" />;
    return <span className="font-bold text-muted-foreground">{position}º</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Aprovado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Pendente
          </Badge>
        );
    }
  };

  const handlePayClick = (clipper: ClipperEarning) => {
    setSelectedClipper(clipper);
    setNotes("");
    setModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedClipper) return;
    
    setProcessing(true);
    const result = await onPayment(selectedClipper.user_id, selectedClipper.calculated_amount, notes);
    setProcessing(false);

    if (result.success) {
      toast.success(`Pagamento de ${formatCurrency(selectedClipper.calculated_amount)} realizado para ${selectedClipper.username}`);
      setModalOpen(false);
      setSelectedClipper(null);
    } else {
      toast.error(`Erro ao processar pagamento: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clippers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum clipador encontrado para este período.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-16">Pos.</TableHead>
              <TableHead>Clipador</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead className="text-center">Vídeos</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clippers.map((clipper) => (
              <TableRow 
                key={clipper.user_id}
                className={clipper.position <= 3 ? 'bg-primary/5' : ''}
              >
                <TableCell>
                  <div className="flex justify-center">
                    {getRankIcon(clipper.position)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-primary/30">
                      <AvatarImage src={clipper.avatar_url || undefined} />
                      <AvatarFallback>{clipper.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{clipper.username}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    {formatNumber(clipper.total_views)}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Video className="h-4 w-4" />
                    {clipper.total_videos}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-green-400">
                    {formatCurrency(clipper.calculated_amount)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(clipper.payment_status)}
                </TableCell>
                <TableCell className="text-right">
                  {clipper.payment_status !== 'paid' && clipper.calculated_amount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePayClick(clipper)}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <Wallet className="h-4 w-4 mr-1" />
                      Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Payment Confirmation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-400" />
              Confirmar Pagamento
            </DialogTitle>
            <DialogDescription>
              Confirme os detalhes do pagamento abaixo.
            </DialogDescription>
          </DialogHeader>

          {selectedClipper && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={selectedClipper.avatar_url || undefined} />
                  <AvatarFallback>{selectedClipper.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedClipper.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClipper.position}º lugar • {formatNumber(selectedClipper.total_views)} views
                  </p>
                </div>
              </div>

              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatCurrency(selectedClipper.calculated_amount)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observações (opcional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione uma observação sobre este pagamento..."
                  rows={2}
                />
              </div>

              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-yellow-400">
                  ⚠️ O valor será creditado na carteira do clipador e ficará disponível para saque.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmPayment} 
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
