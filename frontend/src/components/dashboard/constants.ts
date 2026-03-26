import { LayoutDashboard, ListTodo, Target, type LucideIcon } from 'lucide-react';
import { type DashboardTab, type QueueFilter } from './types';

export const dashboardTabs: Array<{ value: DashboardTab; label: string; description: string; icon: LucideIcon }> = [
  { value: 'overview', label: 'Overview', description: 'Snapshot of queue and delivery state.', icon: LayoutDashboard },
  { value: 'queue', label: 'Queue', description: 'Add topics and work rows by status.', icon: ListTodo },
];

export const filterOptions: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'drafted', label: 'Drafted' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
];