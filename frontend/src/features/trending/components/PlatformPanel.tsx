import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardItemVariants, spring } from '@/lib/motion';

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
    <motion.div
      variants={cardItemVariants}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(124,58,237,0.14)" }}
      transition={spring.smooth}
      style={{ willChange: "transform" }}
      className="glass-panel-strong rounded-xl overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
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
    </motion.div>
  );
}
