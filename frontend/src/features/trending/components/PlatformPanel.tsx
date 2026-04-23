import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  count: number;
  trend?: number;
  color: string;
  icon: ReactNode;
  children: ReactNode;
}

export function PlatformPanel({ title, count, trend, color, icon, children }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <div>
            <h3 className="text-ink font-medium">{title}</h3>
            <p className="text-xs text-muted">{count} items</p>
          </div>
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
