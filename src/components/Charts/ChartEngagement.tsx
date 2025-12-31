import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { ChartSkeleton } from './ChartSkeleton';

interface EngagementData {
  platform: string;
  engagement: number;
  likes: number;
  comments: number;
  color?: string;
}

interface ChartEngagementProps {
  data: EngagementData[];
  title: string;
  isLoading?: boolean;
}

const platformColors: Record<string, string> = {
  instagram: '#E1306C',
  tiktok: '#25F4EE',
  youtube: '#FF0000',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground capitalize">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChartEngagement({ data, title, isLoading }: ChartEngagementProps) {
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      const timer = setTimeout(() => setShowChart(true), 100);
      return () => clearTimeout(timer);
    }
    setShowChart(false);
  }, [isLoading, data]);

  if (isLoading || !showChart) {
    return <ChartSkeleton type="bar" title={title} />;
  }

  const dataWithColors = data.map(item => ({
    ...item,
    color: platformColors[item.platform.toLowerCase()] || '#8b5cf6'
  }));

  return (
    <GlowCard className="h-full animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataWithColors} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="platform" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground capitalize">{value}</span>
              )}
            />
            <Bar 
              dataKey="engagement" 
              name="Engajamento"
              radius={[8, 8, 0, 0]}
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
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
}
