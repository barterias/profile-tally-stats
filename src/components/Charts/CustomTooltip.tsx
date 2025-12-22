import { Instagram, Youtube, Video } from 'lucide-react';

interface TooltipPayload {
  name?: string;
  value?: number;
  payload?: {
    platform?: string;
    name?: string;
    color?: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4 text-[#E1306C]" />,
  tiktok: <Video className="h-4 w-4 text-[#25F4EE]" />,
  youtube: <Youtube className="h-4 w-4 text-[#FF0000]" />,
};

const platformColors: Record<string, string> = {
  instagram: '#E1306C',
  tiktok: '#25F4EE',
  youtube: '#FF0000',
};

const formatValue = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export function PlatformTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const platformName = data.payload?.platform?.toLowerCase() || data.payload?.name?.toLowerCase() || '';
  const icon = platformIcons[platformName];
  const color = platformColors[platformName] || data.payload?.color || 'hsl(var(--primary))';

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div 
            className="p-1.5 rounded-md" 
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
        )}
        <span className="font-semibold capitalize text-foreground">
          {data.payload?.platform || data.payload?.name || 'Plataforma'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-muted-foreground">
          {data.name}: <span className="font-medium text-foreground">{formatValue(data.value || 0)}</span>
        </span>
      </div>
    </div>
  );
}

export function LineChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const platformName = label?.toLowerCase() || '';
  const icon = platformIcons[platformName];
  const color = platformColors[platformName] || '#8b5cf6';

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div 
            className="p-1.5 rounded-md" 
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
        )}
        <span className="font-semibold capitalize text-foreground">{label}</span>
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Views: </span>
        <span className="font-medium text-foreground">{formatValue(data.value || 0)}</span>
      </div>
    </div>
  );
}

export function BarChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg animate-fade-in">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">{entry.name}: </span>
          <span className="font-medium text-foreground">{formatValue(entry.value || 0)}</span>
        </div>
      ))}
    </div>
  );
}
