import { Globe, Tag, Clock, ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';

const REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'UAE' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'BR', label: 'Brazil' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'BD', label: 'Bangladesh' },
];

const GENRES = [
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'politics', label: 'Politics' },
  { value: 'all', label: 'All Topics' },
];

const WINDOWS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

const REGION_KEY = 'trending_region';
const GENRE_KEY = 'trending_genre';
const WINDOW_KEY = 'trending_window_days';

function readLocal(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function writeLocal(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function FilterSelect({
  icon,
  value,
  onChange,
  children,
}: {
  icon: ReactNode;
  value: string | number;
  onChange: (val: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-1.5 rounded-lg border border-border/70 bg-canvas/90 px-2.5 py-1.5 shadow-sm hover:border-border hover:bg-secondary/50 transition-all duration-150 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40">
      <span className="text-muted shrink-0 flex items-center">{icon}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer pr-5 min-w-0"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 h-3 w-3 text-muted pointer-events-none shrink-0" />
    </div>
  );
}

interface TrendingFiltersProps {
  region: string;
  genre: string;
  windowDays: number;
  onRegionChange: (region: string) => void;
  onGenreChange: (genre: string) => void;
  onWindowChange: (days: number) => void;
}

export function TrendingFilters({
  region, genre, windowDays,
  onRegionChange, onGenreChange, onWindowChange,
}: TrendingFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        icon={<Globe className="h-3.5 w-3.5" />}
        value={region}
        onChange={(val) => { writeLocal(REGION_KEY, val); onRegionChange(val); }}
      >
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>{r.label}</option>
        ))}
      </FilterSelect>

      <FilterSelect
        icon={<Tag className="h-3.5 w-3.5" />}
        value={genre}
        onChange={(val) => { writeLocal(GENRE_KEY, val); onGenreChange(val); }}
      >
        {GENRES.map((g) => (
          <option key={g.value} value={g.value}>{g.label}</option>
        ))}
      </FilterSelect>

      <FilterSelect
        icon={<Clock className="h-3.5 w-3.5" />}
        value={windowDays}
        onChange={(val) => { writeLocal(WINDOW_KEY, val); onWindowChange(Number(val)); }}
      >
        {WINDOWS.map((w) => (
          <option key={w.value} value={w.value}>{w.label}</option>
        ))}
      </FilterSelect>
    </div>
  );
}

// Convenience initializer — reads from localStorage for initial state
export function readFilterDefaults(): { region: string; genre: string; windowDays: number } {
  return {
    region: readLocal(REGION_KEY, 'US'),
    genre: readLocal(GENRE_KEY, 'technology'),
    windowDays: Number(readLocal(WINDOW_KEY, '7')),
  };
}
