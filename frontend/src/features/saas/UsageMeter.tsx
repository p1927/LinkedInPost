interface UsageMeterProps {
  used: number;
  budget: number;
  resetDate: string;
}

export default function UsageMeter({ used, budget, resetDate }: UsageMeterProps) {
  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
  const formattedUsed = (used / 1000).toFixed(0);
  const formattedBudget = (budget / 1000).toFixed(0);

  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      title={`Resets ${new Date(resetDate).toLocaleDateString()}`}
    >
      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span>{formattedUsed}k / {formattedBudget}k tokens</span>
    </div>
  );
}
