import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cardItemVariants } from '@/lib/motion';

interface FeedSectionProps {
  title: string;
  count: number;
  color: string;
  icon: ReactNode;
  children: ReactNode;
}

export function FeedSection({ title, count, color, icon, children }: FeedSectionProps) {
  return (
    <motion.section
      variants={cardItemVariants}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}18` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="ml-auto text-xs font-medium text-muted bg-border/40 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </motion.section>
  );
}
