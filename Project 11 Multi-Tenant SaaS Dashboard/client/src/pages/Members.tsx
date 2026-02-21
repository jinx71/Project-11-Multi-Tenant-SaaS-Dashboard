import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { ApiResponse, Member, Role } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { RoleGate } from '../components/RoleGate';

export const Members = () => {
  const { current } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<{ members: Member[] }>>(
        `/workspaces/${current.id}/members`
      );
      setMembers(res.data.data.members);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setError('');
    setNotice('');
    try {
      await api.post(`/workspaces/${current.id}/members`, { email, role });
      setEmail('');
      setNotice('Member added');
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleRole = async (member: Member, newRole: Role) => {
    if (!current) return;
    setError('');
    try {
      await api.patch(`/workspaces/${current.id}/members/${member.id}`, { role: newRole });
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleRemove = async (member: Member) => {
    if (!current) return;
    if (!window.confirm(`Remove ${member.user.name} from ${current.name}?`)) return;
    setError('');
    try {
      await api.delete(`/workspaces/${current.id}/members/${member.id}`);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (!current) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Members</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who can access <span className="font-medium text-ink-900">{current.name}</span>, and what they can do
        </p>
      </header>

      <RoleGate allow={['ADMIN']}>
        <form onSubmit={handleInvite} className="mb-6 flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@email.com"
            required
            className="min-w-56 flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="USER">User</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Add member
          </button>
        </form>
      </RoleGate>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-4 text-sm text-accent-dark">{notice}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading members...</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{member.user.name}</p>
                <p className="truncate text-xs text-slate-400">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <RoleGate allow={['ADMIN']}>
                  <select
                    value={member.role}
                    onChange={(e) => handleRole(member, e.target.value as Role)}
                    className="rounded-md border border-line px-2 py-1 text-xs"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="USER">User</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <button
                    onClick={() => handleRemove(member)}
                    className="rounded-md border border-line px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </RoleGate>
                <RoleGate allow={['USER', 'VIEWER']}>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {member.role.toLowerCase()}
                  </span>
                </RoleGate>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
