import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface PanelConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface Props {
  panels: PanelConfig[];
  enabled: string[];
  onToggle: (id: string, enabled: boolean) => void;
}

export function PanelToggle({ panels, enabled, onToggle }: Props) {
  return (
    <div className="space-y-1.5">
      {panels.map((panel) => {
        const isEnabled = enabled.includes(panel.id);
        return (
          <motion.button
            key={panel.id}
            type="button"
            onClick={() => onToggle(panel.id, !isEnabled)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer border',
              isEnabled
                ? 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/12'
                : 'bg-transparent text-muted border-transparent hover:bg-secondary/60 hover:text-ink',
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-4 h-4 rounded-full transition-colors',
              isEnabled ? 'text-primary' : 'text-muted/60',
            )}>
              {isEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
            </span>
            <span className="flex-1 text-left">{panel.label}</span>
            {isEnabled && (
              <motion.span
                layoutId={`panel-dot-${panel.id}`}
                className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
