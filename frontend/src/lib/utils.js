export const formatStatus = (status) =>
  status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '';

export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const statusColor = (status) => {
  const map = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    ON_TRIP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    IN_SHOP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    RETIRED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    OFF_DUTY: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    DISPATCHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    ACTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    CLOSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

export const roleLabel = (role) => ({
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
}[role] || role);
