import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client';
import { ApiResponse, Workspace } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { RoleGate } from '../components/RoleGate';

export const Settings = () => {
  const { current, refresh, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [newWorkspace, setNewWorkspace] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (current) setName(current.name);
  }, [current]);

  if (!current) return null;

  const handleRename = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.patch(`/workspaces/${current.id}`, { name });
      await refresh();
      setNotice('Workspace renamed');
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const res = await api.post<ApiResponse<{ workspace: Workspace }>>('/workspaces', {
        name: newWorkspace,
      });
      await refresh();
      switchWorkspace(res.data.data.workspace.id);
      setNewWorkspace('');
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleDelete = async () => {
    const confirmed = window.prompt(
      `This permanently deletes "${current.name}" and all its projects. Type the workspace name to confirm.`
    );
    if (confirmed !== current.name) return;
    setError('');
    try {
      await api.delete(`/workspaces/${current.id}`);
      localStorage.removeItem('workspaceId');
      await refresh();
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Workspace name, creation, and the danger zone</p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-accent-dark">{notice}</p>}

      <RoleGate allow={['ADMIN']}>
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-display font-medium">Workspace name</h2>
          <form onSubmit={handleRename} className="mt-3 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Save changes
            </button>
          </form>
        </section>
      </RoleGate>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display font-medium">Create a new workspace</h2>
        <p className="mt-1 text-sm text-slate-500">
          You become the admin of every workspace you create.
        </p>
        <form onSubmit={handleCreate} className="mt-3 flex gap-2">
          <input
            value={newWorkspace}
            onChange={(e) => setNewWorkspace(e.target.value)}
            placeholder="Workspace name"
            required
            minLength={2}
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Create workspace
          </button>
        </form>
      </section>

      <RoleGate allow={['ADMIN']}>
        <section className="rounded-xl border border-red-200 bg-white p-5">
          <h2 className="font-display font-medium text-red-700">Danger zone</h2>
          <p className="mt-1 text-sm text-slate-500">
            Deleting a workspace removes its members, projects, and billing link permanently.
          </p>
          <button
            onClick={handleDelete}
            className="mt-3 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete this workspace
          </button>
        </section>
      </RoleGate>
    </div>
  );
};
