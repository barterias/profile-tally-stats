import { GlowCard } from '@/components/ui/GlowCard';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartSkeletonProps {
  type?: 'pie' | 'line' | 'bar';
  title?: string;
}

export function ChartSkeleton({ type = 'line', title }: ChartSkeletonProps) {
  return (
    <GlowCard className="h-full animate-pulse">
      {title && <Skeleton className="h-6 w-48 mb-4" />}
      <div className="h-[300px] flex items-center justify-center">
        {type === 'pie' && (
          <div className="relative">
            {/* Outer ring */}
            <div className="w-40 h-40 rounded-full border-[20px] border-muted/30 animate-pulse" />
            {/* Inner circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-background" />
            </div>
            {/* Animated segments */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-[20px] border-transparent border-t-primary/20 animate-spin" style={{ animationDuration: '2s' }} />
            </div>
          </div>
        )}
        
        {type === 'line' && (
          <div className="w-full h-full flex flex-col justify-end px-4 pb-8 gap-2">
            {/* Y-axis labels */}
            <div className="absolute left-4 top-4 bottom-12 flex flex-col justify-between">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-6" />
            </div>
            {/* Chart area */}
            <div className="flex items-end justify-around gap-1 h-48 ml-10">
              {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-primary/20 to-primary/5 rounded-t animate-pulse"
                  style={{ 
                    height: `${height}%`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
            {/* X-axis labels */}
            <div className="flex justify-around ml-10 mt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        )}
        
        {type === 'bar' && (
          <div className="w-full h-full flex flex-col justify-center px-4 gap-3">
            {[80, 65, 90, 45, 70].map((width, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-20 shrink-0" />
                <div 
                  className="h-6 bg-gradient-to-r from-primary/30 to-primary/10 rounded animate-pulse"
                  style={{ 
                    width: `${width}%`,
                    animationDelay: `${i * 150}ms`
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

export function ChartSkeletonSmall({ type = 'pie' }: { type?: 'pie' | 'bar' }) {
  return (
    <div className="animate-pulse">
      <div className="h-[200px] flex items-center justify-center">
        {type === 'pie' && (
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-[16px] border-muted/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-background" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-[16px] border-transparent border-t-primary/20 animate-spin" style={{ animationDuration: '2s' }} />
            </div>
          </div>
        )}
        {type === 'bar' && (
          <div className="w-full space-y-2 px-4">
            {[70, 85, 50, 90, 60].map((width, i) => (
              <div 
                key={i}
                className="h-5 bg-gradient-to-r from-primary/30 to-primary/10 rounded"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
