import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '../api/client';
import { ApiResponse, Workspace } from '../types';
import { useAuth } from './AuthContext';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  current: Workspace | null;
  switchWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(
    localStorage.getItem('workspaceId')
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api.get<ApiResponse<{ workspaces: Workspace[] }>>('/workspaces');
    setWorkspaces(res.data.data.workspaces);
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user, refresh]);

  const current =
    workspaces.find((w) => w.id === currentId) ?? workspaces[0] ?? null;

  const switchWorkspace = (id: string) => {
    localStorage.setItem('workspaceId', id);
    setCurrentId(id);
  };

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, current, switchWorkspace, refresh, loading }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
};
