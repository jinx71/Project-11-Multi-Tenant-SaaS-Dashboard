import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiError } from '../api/client';
import { ApiResponse, Plan } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { RoleGate } from '../components/RoleGate';
import { PlanBadge } from '../components/PlanBadge';

interface PlanCard {
  plan: Plan;
  price: string;
  blurb: string;
  features: string[];
}

const plans: PlanCard[] = [
  {
    plan: 'FREE',
    price: '$0',
    blurb: 'For trying things out',
    features: ['3 projects', '3 members', 'Community support'],
  },
  {
    plan: 'PRO',
    price: '$12/mo',
    blurb: 'For growing teams',
    features: ['50 projects', '15 members', 'Priority support'],
  },
  {
    plan: 'ENTERPRISE',
    price: '$49/mo',
    blurb: 'For serious scale',
    features: ['Unlimited projects', 'Unlimited members', 'Dedicated support'],
  },
];

export const Billing = () => {
  const { current, refresh } = useWorkspace();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Plan | 'portal' | null>(null);

  const status = params.get('status');

  const handleUpgrade = async (plan: 'PRO' | 'ENTERPRISE') => {
    if (!current) return;
    setError('');
    setBusy(plan);
    try {
      const res = await api.post<ApiResponse<{ url: string }>>(
        `/workspaces/${current.id}/billing/checkout`,
        { plan }
      );
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(apiError(err));
      setBusy(null);
    }
  };

  const handlePortal = async () => {
    if (!current) return;
    setError('');
    setBusy('portal');
    try {
      const res = await api.post<ApiResponse<{ url: string }>>(
        `/workspaces/${current.id}/billing/portal`
      );
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(apiError(err));
      setBusy(null);
    }
  };

  if (!current) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">Billing</h1>
          <PlanBadge plan={current.plan} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Subscription for <span className="font-medium text-ink-900">{current.name}</span>
          {current.stripeCurrentPeriodEnd && (
            <> &middot; renews {new Date(current.stripeCurrentPeriodEnd).toLocaleDateString()}</>
          )}
        </p>
      </header>

      {status === 'success' && (
        <div className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-dark">
          Payment complete. The plan updates within a few seconds once Stripe confirms it -{' '}
          <button onClick={() => refresh()} className="font-medium underline">
            refresh plan
          </button>
        </div>
      )}
      {status === 'cancelled' && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout cancelled. No changes were made.
        </div>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((card) => {
          const isCurrent = card.plan === current.plan;
          return (
            <div
              key={card.plan}
              className={`flex flex-col rounded-xl border bg-white p-5 ${
                isCurrent ? 'border-accent ring-1 ring-accent' : 'border-line'
              }`}
            >
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
                {card.plan}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold">{card.price}</p>
              <p className="mt-1 text-sm text-slate-500">{card.blurb}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {card.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-accent">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                {isCurrent ? (
                  <span className="block rounded-md bg-slate-100 py-2 text-center text-sm font-medium text-slate-500">
                    Current plan
                  </span>
                ) : card.plan === 'FREE' ? (
                  <span className="block py-2 text-center text-xs text-slate-400">
                    Downgrade via Manage billing
                  </span>
                ) : (
                  <RoleGate allow={['ADMIN']}>
                    <button
                      onClick={() => handleUpgrade(card.plan as 'PRO' | 'ENTERPRISE')}
                      disabled={busy !== null}
                      className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
                    >
                      {busy === card.plan ? 'Redirecting...' : `Upgrade to ${card.plan}`}
                    </button>
                  </RoleGate>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RoleGate allow={['ADMIN']}>
        <button
          onClick={handlePortal}
          disabled={busy !== null}
          className="mt-6 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          {busy === 'portal' ? 'Opening portal...' : 'Manage billing'}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          Update card details, view invoices, change or cancel the plan in the Stripe customer portal.
        </p>
      </RoleGate>

      <RoleGate allow={['USER', 'VIEWER']}>
        <p className="mt-6 text-sm text-slate-500">
          Only workspace admins can change the plan.
        </p>
      </RoleGate>
    </div>
  );
};
