import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="flex flex-wrap gap-2">
      {panels.map((panel) => {
        const isEnabled = enabled.includes(panel.id);
        return (
          <motion.button
            key={panel.id}
            onClick={() => onToggle(panel.id, !isEnabled)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors border ${
              isEnabled
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary text-muted border-transparent hover:text-ink'
            }`}
          >
            {isEnabled && (
              <motion.span
                layoutId={`panel-indicator-${panel.id}`}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
            )}
            {isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{panel.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
