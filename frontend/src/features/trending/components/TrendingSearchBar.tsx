import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export function TrendingSearchBar({ value, onChange, onSearch }: Props) {
  return (
    <div className="relative max-w-2xl">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        placeholder="Enter a topic to explore trending content..."
        className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />
    </div>
  );
}
