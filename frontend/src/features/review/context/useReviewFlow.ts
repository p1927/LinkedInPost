import { useContext } from 'react';
import { ReviewFlowContext } from './ReviewFlowContext';
import type { ReviewFlowContextValue } from './types';

export function useReviewFlow(): ReviewFlowContextValue {
  const context = useContext(ReviewFlowContext);
  if (!context) {
    throw new Error('useReviewFlow must be used within a ReviewFlowProvider');
  }
  return context;
}
