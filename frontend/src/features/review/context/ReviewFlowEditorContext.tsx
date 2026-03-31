import { createContext, useContext } from 'react';
import { type ReviewFlowEditorContextValue } from './types';

export const ReviewFlowEditorContext = createContext<ReviewFlowEditorContextValue | null>(null);

export function useReviewFlowEditor(): ReviewFlowEditorContextValue {
  const context = useContext(ReviewFlowEditorContext);
  if (!context) {
    throw new Error('useReviewFlowEditor must be used within a ReviewFlowProvider');
  }
  return context;
}
