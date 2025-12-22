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

// High contrast, distinct colors for charts
const COLORS = ['#E1306C', '#25F4EE', '#FF0000', '#facc15', '#34d399', '#a78bfa'];

// Platform-specific colors
const platformColors: Record<string, string> = {
  tiktok: '#25F4EE',      // TikTok turquoise
  youtube: '#FF0000',     // YouTube red
  instagram: '#E1306C',   // Instagram pink/purple
  kwai: '#facc15',        // Yellow
  facebook: '#3b82f6',    // Blue
  nodata: '#6b7280',      // Gray for no data state
};

export function ChartPiePlatforms({ data, title }: ChartPiePlatformsProps) {
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: platformColors[item.platform.toLowerCase()] || COLORS[index % COLORS.length]
  }));

  return (
    <GlowCard className="h-full animate-fade-in">
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
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {dataWithColors.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="transition-opacity duration-300 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              itemStyle={{
                color: 'hsl(var(--foreground))'
              }}
              labelStyle={{
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
