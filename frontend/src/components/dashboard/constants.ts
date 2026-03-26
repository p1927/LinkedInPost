import { type QueueFilter } from './types';

export const filterOptions: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'drafted', label: 'Drafted' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
];