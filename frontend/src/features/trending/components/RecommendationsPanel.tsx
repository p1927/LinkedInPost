import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, tagVariants } from '@/lib/motion';

interface Props {
  topics: string[];
  onSelectTopic: (topic: string) => void;
}

export function RecommendationsPanel({ topics, onSelectTopic }: Props) {
  if (topics.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="glass-panel rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-yellow-500" size={18} />
        <h3 className="text-ink font-medium">Recommended Topics</h3>
      </div>
      <motion.div className="flex flex-wrap gap-2" variants={containerVariants}>
        {topics.map((topic) => (
          <motion.button
            key={topic}
            onClick={() => onSelectTopic(topic)}
            variants={tagVariants}
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="px-3 py-1.5 bg-secondary text-muted text-sm rounded-full hover:bg-tertiary hover:text-ink transition-colors border border-transparent hover:border-primary/50 cursor-pointer"
          >
            {topic}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
