import { useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import StatCard from "@/components/Dashboard/StatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Wallet() {
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Mock data
  const stats = {
    balance: 847.32,
    totalEarnings: 3245.67,
    pending: 125.40,
  };

  const evolutionData = Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
    earnings: Math.floor(Math.random() * 500) + 200,
  }));

  const transactions = [
    {
      id: "1",
      type: "credit",
      description: "Prêmio - Spartans (1º lugar)",
      amount: 500.0,
      date: "2024-01-15",
      status: "completed",
    },
    {
      id: "2",
      type: "debit",
      description: "Saque PIX",
      amount: -200.0,
      date: "2024-01-10",
      status: "completed",
    },
    {
      id: "3",
      type: "credit",
      description: "Prêmio - Café com Ferri",
      amount: 150.0,
      date: "2024-01-08",
      status: "pending",
    },
    {
      id: "4",
      type: "credit",
      description: "Bônus de Engajamento",
      amount: 75.5,
      date: "2024-01-05",
      status: "completed",
    },
  ];

  const handleWithdraw = () => {
    // Handle withdrawal logic
    console.log("Withdraw:", withdrawAmount);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">Carteira</h1>
            <p className="text-muted-foreground">
              Gerencie seus ganhos e saques
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="premium-gradient">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Solicitar Saque
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Saque</DialogTitle>
                <DialogDescription>
                  Informe o valor que deseja sacar. O pagamento será processado em até 48h.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Saldo disponível: R$ {stats.balance.toFixed(2)}
                  </p>
                </div>
                <Button onClick={handleWithdraw} className="w-full">
                  Confirmar Saque
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Saldo Disponível"
            value={`R$ ${stats.balance.toFixed(2)}`}
            icon={DollarSign}
            className="col-span-1 md:col-span-1"
          />
          <StatCard
            title="Ganhos Totais"
            value={`R$ ${stats.totalEarnings.toFixed(2)}`}
            icon={TrendingUp}
            trend={{ value: "15.2%", isPositive: true }}
          />
          <StatCard
            title="Em Processamento"
            value={`R$ ${stats.pending.toFixed(2)}`}
            icon={Clock}
            subtitle="Será liberado em breve"
          />
        </div>

        {/* Evolution Chart */}
        <ChartCard
          title="Evolução de Ganhos"
          subtitle="Histórico dos últimos 12 meses"
          action={
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Transactions */}
        <Card className="glass-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Histórico de Transações</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Todas as suas movimentações financeiras
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {transaction.status === "completed"
                        ? "Concluído"
                        : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      transaction.type === "credit"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {transaction.type === "credit" ? "+" : ""}R${" "}
                    {Math.abs(transaction.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </MainLayout>
  );
}
