import { useState, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '../../../lib/cn';
import type { InterestGroup } from '../types';

const STORAGE_KEY = 'interest-groups';

const DEFAULT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

function loadGroups(): InterestGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGroups(groups: InterestGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

interface GroupEditorProps {
  group?: InterestGroup;
  onSave: (data: Omit<InterestGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function GroupEditor({ group, onSave, onCancel }: GroupEditorProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [topics, setTopics] = useState(group?.topics.join(', ') ?? '');
  const [domains, setDomains] = useState(group?.domains.join(', ') ?? '');
  const [color, setColor] = useState(group?.color ?? DEFAULT_COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
      domains: domains.split(',').map((d) => d.trim()).filter(Boolean),
      color,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-canvas/50 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="flex-1"
        />
        <Button size="icon-sm" variant="ghost" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>
      <Input
        value={topics}
        onChange={(e) => setTopics(e.target.value)}
        placeholder="Topics (comma-separated)"
        className="text-xs"
      />
      <Input
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
        placeholder="Domains (comma-separated)"
        className="text-xs"
      />
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn(
              'size-5 rounded-full border-2 transition-all',
              color === c ? 'scale-110 border-ink' : 'border-transparent',
            )}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <Button size="sm" variant="ink" onClick={handleSave} disabled={!name.trim()}>
        {group ? 'Update group' : 'Add group'}
      </Button>
    </div>
  );
}

interface InterestGroupsSettingsProps {
  className?: string;
}

export function InterestGroupsSettings({ className }: InterestGroupsSettingsProps) {
  const [groups, setGroups] = useState<InterestGroup[]>(loadGroups);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const refresh = useCallback(() => setGroups(loadGroups()), []);

  const handleSave = useCallback(
    (data: Omit<InterestGroup, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      if (editingId) {
        const updated = groups.map((g) =>
          g.id === editingId ? { ...g, ...data, updatedAt: now } : g,
        );
        saveGroups(updated);
        setGroups(updated);
        setEditingId(null);
      } else {
        const newGroup: InterestGroup = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        const next = [...groups, newGroup];
        saveGroups(next);
        setGroups(next);
        setIsAdding(false);
      }
    },
    [editingId, groups],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const next = groups.filter((g) => g.id !== id);
      saveGroups(next);
      setGroups(next);
      if (editingId === id) setEditingId(null);
    },
    [groups, editingId],
  );

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setIsAdding(false);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        {groups.length === 0 && !isAdding && (
          <p className="text-xs text-muted">No interest groups yet. Add one below.</p>
        )}
        {groups.map((group) => (
          <div key={group.id}>
            {editingId === group.id ? (
              <GroupEditor
                group={group}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{group.name}</p>
                  <p className="text-xs text-muted truncate">
                    {group.topics.join(', ') || 'No topics'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleEdit(group.id)}
                    className="size-7 min-h-0 min-w-0 text-ink/50 hover:text-ink"
                  >
                    Edit
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(group.id)}
                    className="size-7 min-h-0 min-w-0 text-ink/50 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <GroupEditor
          onSave={handleSave}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add group
        </Button>
      )}
    </div>
  );
}
