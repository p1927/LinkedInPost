import { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export function TrendingSearchBar({ value, onChange, onSearch }: Props) {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <motion.div className="relative max-w-2xl">
      <motion.span
        className="absolute left-4 top-1/2 -translate-y-1/2"
        animate={{ color: isFocused ? "#7C3AED" : "#94a3b8" }}
        transition={{ duration: 0.2 }}
      >
        <Search size={20} />
      </motion.span>
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          boxShadow: isFocused
            ? "0 0 0 3px rgba(124,58,237,0.25), 0 8px 24px rgba(124,58,237,0.12)"
            : "none",
        }}
        transition={{ duration: 0.2 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Enter a topic to explore trending content..."
        className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />
    </motion.div>
  );
}
