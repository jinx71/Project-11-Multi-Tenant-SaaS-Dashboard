import { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { PlanBadge } from './PlanBadge';

export const WorkspaceSwitcher = () => {
  const { workspaces, current, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (!current) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-left hover:border-ink-700/50 hover:bg-ink-700"
      >
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white">{current.name}</p>
          <p className="text-xs text-slate-400">{current.role.toLowerCase()}</p>
        </div>
        <PlanBadge plan={current.plan} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-ink-700 bg-ink-800 shadow-xl">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                switchWorkspace(ws.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-700 ${
                ws.id === current.id ? 'text-white' : 'text-slate-300'
              }`}
            >
              <span className="truncate">{ws.name}</span>
              <PlanBadge plan={ws.plan} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
