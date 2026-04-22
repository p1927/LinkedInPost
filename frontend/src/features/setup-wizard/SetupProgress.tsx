import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface LogEntry {
  message: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface SetupProgressProps {
  title: string;
  logs: LogEntry[];
  currentIndex: number;
}

export function SetupProgress({ title, logs, currentIndex }: SetupProgressProps) {
  const getIcon = (status: LogEntry['status'], index: number) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'running':
        return <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-5 w-5 text-violet-600" />
        </motion.div>;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-muted/50" />;
    }
  };

  const getStatusColor = (status: LogEntry['status']) => {
    switch (status) {
      case 'done':
        return 'text-green-600';
      case 'running':
        return 'text-violet-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-muted';
    }
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-8 shadow-2xl">
      <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
        {title}
      </h2>
      <p className="text-muted mb-8">
        Setting up your development environment...
      </p>

      <div className="space-y-4">
        {logs.map((log, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="flex-shrink-0">
              {getIcon(log.status, index)}
            </div>
            <div className="flex-1">
              <span className={`text-sm ${getStatusColor(log.status)}`}>
                {log.message}
              </span>
            </div>
            {index === currentIndex && log.status === 'running' && (
              <span className="text-xs text-violet-600 animate-pulse">Working...</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-8">
        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-600"
            initial={{ width: '0%' }}
            animate={{
              width: `${((logs.filter(l => l.status === 'done').length + (logs[currentIndex]?.status === 'running' ? 0.5 : 0)) / Math.max(logs.length, 1)) * 100}%`
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="mt-2 text-xs text-muted text-right">
          {logs.filter(l => l.status === 'done').length} of {logs.length} complete
        </p>
      </div>
    </div>
  );
}