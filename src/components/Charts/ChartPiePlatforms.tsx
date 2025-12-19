import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';

interface PlatformData {
  platform: string;
  value: number;
  color?: string;
}

interface ChartPiePlatformsProps {
  data: PlatformData[];
  title: string;
}

const COLORS = ['#8b5cf6', '#22c55e', '#3b82f6', '#f97316', '#ec4899', '#06b6d4'];

const platformColors: Record<string, string> = {
  tiktok: '#00f2ea',
  youtube: '#ff0000',
  instagram: '#e4405f',
  kwai: '#ff7b00',
  facebook: '#1877f2',
};

export function ChartPiePlatforms({ data, title }: ChartPiePlatformsProps) {
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: platformColors[item.platform.toLowerCase()] || COLORS[index % COLORS.length]
  }));

  return (
    <GlowCard className="h-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithColors}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="platform"
            >
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value;
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground capitalize">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
}
