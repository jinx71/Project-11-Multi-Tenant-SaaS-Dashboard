import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { ApiResponse, Project, ProjectStatus } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { RoleGate } from '../components/RoleGate';

const statusStyles: Record<ProjectStatus, string> = {
  active: 'bg-accent-soft text-accent-dark',
  paused: 'bg-amber-100 text-amber-800',
  archived: 'bg-slate-100 text-slate-500',
};

export const Dashboard = () => {
  const { current } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<{ projects: Project[] }>>(
        `/workspaces/${current.id}/projects`
      );
      setProjects(res.data.data.projects);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setError('');
    try {
      await api.post(`/workspaces/${current.id}/projects`, { name });
      setName('');
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleStatus = async (project: Project, status: ProjectStatus) => {
    if (!current) return;
    setError('');
    try {
      await api.patch(`/workspaces/${current.id}/projects/${project.id}`, { status });
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleDelete = async (project: Project) => {
    if (!current) return;
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/workspaces/${current.id}/projects/${project.id}`);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (!current) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything in <span className="font-medium text-ink-900">{current.name}</span>
        </p>
      </header>

      <RoleGate allow={['ADMIN', 'USER']}>
        <form onSubmit={handleCreate} className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            required
            minLength={2}
            className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Create project
          </button>
        </form>
      </RoleGate>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-display font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create the first project to get this workspace moving.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{project.name}</p>
                <p className="text-xs text-slate-400">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[project.status]}`}>
                  {project.status}
                </span>
                <RoleGate allow={['ADMIN', 'USER']}>
                  <select
                    value={project.status}
                    onChange={(e) => handleStatus(project, e.target.value as ProjectStatus)}
                    className="rounded-md border border-line px-2 py-1 text-xs"
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="archived">archived</option>
                  </select>
                </RoleGate>
                <RoleGate allow={['ADMIN']}>
                  <button
                    onClick={() => handleDelete(project)}
                    className="rounded-md border border-line px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </RoleGate>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
