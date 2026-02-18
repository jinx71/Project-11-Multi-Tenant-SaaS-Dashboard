import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

const navItems = [
  { to: '/', label: 'Projects', end: true },
  { to: '/members', label: 'Members' },
  { to: '/billing', label: 'Billing' },
  { to: '/settings', label: 'Settings' },
];

export const Layout = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { loading: wsLoading } = useWorkspace();

  if (authLoading || wsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading your workspace...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-ink-950 p-4">
        <div className="mb-6 flex items-center gap-2 px-1">
          <span className="grid h-7 w-7 place-items-center rounded bg-accent font-display text-sm font-bold text-white">
            Q
          </span>
          <span className="font-display text-lg font-semibold text-white">Quorum</span>
        </div>

        <WorkspaceSwitcher />

        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-ink-800 text-white'
                    : 'text-slate-400 hover:bg-ink-900 hover:text-slate-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-ink-800 pt-4">
          <p className="truncate px-1 text-sm text-slate-300">{user.name}</p>
          <p className="truncate px-1 text-xs text-slate-500">{user.email}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-md border border-ink-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-ink-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};
