import { Globe, Tag, Clock } from 'lucide-react';

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
  const selectClass =
    'rounded-lg border border-white/40 bg-white/30 px-2 py-1.5 text-xs font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Globe className="h-3 w-3" />
        <select
          className={selectClass}
          value={region}
          onChange={(e) => {
            writeLocal(REGION_KEY, e.target.value);
            onRegionChange(e.target.value);
          }}
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Tag className="h-3 w-3" />
        <select
          className={selectClass}
          value={genre}
          onChange={(e) => {
            writeLocal(GENRE_KEY, e.target.value);
            onGenreChange(e.target.value);
          }}
        >
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Clock className="h-3 w-3" />
        <select
          className={selectClass}
          value={windowDays}
          onChange={(e) => {
            writeLocal(WINDOW_KEY, e.target.value);
            onWindowChange(Number(e.target.value));
          }}
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>
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
