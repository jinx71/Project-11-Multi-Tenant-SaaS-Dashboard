import { ReactNode } from 'react';
import { Role } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
}

// Renders children only if the user's role IN THE CURRENT WORKSPACE is allowed.
// UI convenience only -- the server enforces the same rules on every route.
export const RoleGate = ({ allow, children }: RoleGateProps) => {
  const { current } = useWorkspace();
  if (!current || !allow.includes(current.role)) return null;
  return <>{children}</>;
};
