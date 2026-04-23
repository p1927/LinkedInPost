import { Eye, EyeOff } from 'lucide-react';

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
          <button
            key={panel.id}
            onClick={() => onToggle(panel.id, !isEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors border ${
              isEnabled
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary text-muted border-transparent hover:text-ink'
            }`}
          >
            {isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{panel.label}</span>
          </button>
        );
      })}
    </div>
  );
}
