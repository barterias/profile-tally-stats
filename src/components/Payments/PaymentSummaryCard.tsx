import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface PaymentSummaryCardProps {
  totalPending: number;
  totalPaid: number;
  totalClippers: number;
  paidClippers: number;
}

export function PaymentSummaryCard({ 
  totalPending, 
  totalPaid, 
  totalClippers,
  paidClippers 
}: PaymentSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-xl font-bold text-yellow-400">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pago</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(totalPending + totalPaid)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clippers Pagos</p>
              <p className="text-xl font-bold text-purple-400">{paidClippers}/{totalClippers}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
