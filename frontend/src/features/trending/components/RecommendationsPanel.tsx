import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, tagVariants } from '@/lib/motion';

interface Props {
  topics: string[];
  onSelectTopic: (topic: string) => void;
}

export function RecommendationsPanel({ topics, onSelectTopic }: Props) {
  if (topics.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="glass-panel rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-yellow-100/80">
          <Sparkles className="text-yellow-500" size={12} />
        </div>
        <span className="text-xs font-semibold text-ink">Recommended Topics</span>
        <span className="ml-auto text-[10px] text-muted">{topics.length}</span>
      </div>

      <motion.div className="flex flex-wrap gap-1.5 p-3" variants={containerVariants}>
        {topics.map((topic) => (
          <motion.button
            key={topic}
            type="button"
            onClick={() => onSelectTopic(topic)}
            variants={tagVariants}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="px-2.5 py-1 bg-secondary/60 text-ink/80 text-xs rounded-full border border-border/50 hover:bg-primary/8 hover:text-primary hover:border-primary/30 transition-all duration-150 cursor-pointer"
          >
            {topic}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
