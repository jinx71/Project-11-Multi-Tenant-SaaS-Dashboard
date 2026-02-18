import { Plan } from '../types';

const styles: Record<Plan, string> = {
  FREE: 'bg-ink-800 text-slate-300',
  PRO: 'bg-accent-soft text-accent-dark',
  ENTERPRISE: 'bg-amber-100 text-amber-800',
};

export const PlanBadge = ({ plan }: { plan: Plan }) => (
  <span
    className={`rounded px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider ${styles[plan]}`}
  >
    {plan}
  </span>
);
