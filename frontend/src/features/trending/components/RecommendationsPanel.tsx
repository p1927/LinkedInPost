import { Sparkles } from 'lucide-react';

interface Props {
  topics: string[];
  onSelectTopic: (topic: string) => void;
}

export function RecommendationsPanel({ topics, onSelectTopic }: Props) {
  if (topics.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-yellow-500" size={18} />
        <h3 className="text-ink font-medium">Recommended Topics</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => onSelectTopic(topic)}
            className="px-3 py-1.5 bg-secondary text-muted text-sm rounded-full hover:bg-tertiary hover:text-ink transition-colors border border-transparent hover:border-primary/50"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
