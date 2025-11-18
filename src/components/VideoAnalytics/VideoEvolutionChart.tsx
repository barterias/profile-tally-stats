import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { VideoHistory } from "@/lib/externalSupabase";
import { TrendingUp } from "lucide-react";

interface VideoEvolutionChartProps {
  history: VideoHistory[];
}

export const VideoEvolutionChart = ({ history }: VideoEvolutionChartProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const chartData = history.map((item) => ({
    date: new Date(item.collected_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    views: item.views,
    likes: item.likes,
    comments: item.comments,
  }));

  if (history.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Evolução do Vídeo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Histórico será exibido após múltiplas atualizações
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução do Vídeo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorViews)"
              strokeWidth={2}
              name="Views"
            />
            <Area
              type="monotone"
              dataKey="likes"
              stroke="hsl(var(--accent))"
              fillOpacity={1}
              fill="url(#colorLikes)"
              strokeWidth={2}
              name="Likes"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
