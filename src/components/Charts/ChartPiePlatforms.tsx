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
const COLORS = ['#f472b6', '#22d3ee', '#facc15', '#a78bfa', '#34d399', '#fb923c'];

// Platform-specific colors with high contrast
const platformColors: Record<string, string> = {
  tiktok: '#22d3ee',      // Cyan - distinct and vibrant
  youtube: '#ef4444',     // Red - classic YouTube
  instagram: '#f472b6',   // Pink - Instagram brand
  kwai: '#facc15',        // Yellow - high contrast
  facebook: '#3b82f6',    // Blue - Facebook brand
  nodata: '#6b7280',      // Gray for no data state
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
                color: 'hsl(var(--primary))'
              }}
              itemStyle={{
                color: 'hsl(var(--primary))'
              }}
              labelStyle={{
                color: 'hsl(var(--primary))'
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
