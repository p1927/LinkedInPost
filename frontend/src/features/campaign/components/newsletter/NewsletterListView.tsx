import { Loader2, Mail } from "lucide-react";
import { NewsletterRecord } from "../../schema/newsletterTypes";
import { NewsletterCard } from "./NewsletterCard";

interface Props {
  newsletters: NewsletterRecord[];
  loading: boolean;
  onViewIssues: (id: string) => void;
  onConfig: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

export function NewsletterListView({
  newsletters,
  loading,
  onViewIssues,
  onConfig,
  onToggleActive,
  onDelete,
  onCreateNew,
}: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (newsletters.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Mail className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="text-lg font-semibold text-slate-700">No newsletters yet</p>
        <p className="mb-6 text-sm text-slate-500">
          Create your first newsletter to start sending scheduled content to your audience.
        </p>
        <button
          onClick={onCreateNew}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Create Newsletter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {newsletters.map((newsletter) => (
        <NewsletterCard
          key={newsletter.id}
          newsletter={newsletter}
          onViewIssues={onViewIssues}
          onConfig={onConfig}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
        />
      ))}
      <button
        onClick={onCreateNew}
        className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
      >
        + Create Newsletter
      </button>
    </div>
  );
}
