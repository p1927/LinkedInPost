import { useState, type ReactNode } from 'react';
import { ChevronRight, ChevronLeft, ListTodo, Send, Settings, ChevronDown } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

function SidebarSection({ title, icon, children, defaultOpen = false }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200/80 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icon}
          {title}
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function CollapsibleSidebar({
  queueContent,
  deliveryContent,
  settingsContent,
  isAdmin,
}: {
  queueContent: ReactNode;
  deliveryContent: ReactNode;
  settingsContent: ReactNode;
  isAdmin: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`shrink-0 transition-all duration-300 ease-in-out z-10 ${
        isCollapsed ? 'w-16' : 'w-full lg:w-[340px]'
      }`}
    >
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col max-h-[calc(100vh-80px)]">
        <div className={`flex items-center border-b border-slate-200 py-3 bg-slate-50/50 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
          {!isCollapsed && <h2 className="text-sm font-bold text-slate-900">Dashboard Tools</h2>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={`overflow-y-auto flex-1 ${isCollapsed ? 'hidden' : 'block'}`}>
          <SidebarSection title="Queue" icon={<ListTodo className="h-4 w-4 text-purple-500" />} defaultOpen>
            {queueContent}
          </SidebarSection>
          
          <SidebarSection title="Delivery" icon={<Send className="h-4 w-4 text-purple-500" />}>
            {deliveryContent}
          </SidebarSection>
          
          {isAdmin && (
            <SidebarSection title="Settings" icon={<Settings className="h-4 w-4 text-purple-500" />}>
              {settingsContent}
            </SidebarSection>
          )}
        </div>
      </div>
    </aside>
  );
}
