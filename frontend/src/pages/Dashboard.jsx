import { useEffect, useState } from 'react';
import { Truck, Users, Route, Wrench, TrendingUp, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../lib/api';
import { Card, PageHeader, LoadingSpinner } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ type: '', status: '', region: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.region) params.set('region', filters.region);

    api.get(`/dashboard?${params}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { kpis, recentTrips, vehicleStatusBreakdown } = data;

  const kpiCards = [
    { label: 'Active Vehicles', value: kpis.activeVehicles, icon: Truck, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Available', value: kpis.availableVehicles, icon: Truck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'In Maintenance', value: kpis.vehiclesInMaintenance, icon: Wrench, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Active Trips', value: kpis.activeTrips, icon: Route, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Pending Trips', value: kpis.pendingTrips, icon: Route, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty, icon: Users, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilization}%`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
    { label: 'Expiring Licenses', value: kpis.expiringLicenses, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
  ];

  const chartData = Object.entries(vehicleStatusBreakdown).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time overview of your fleet operations"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { key: 'type', label: 'Vehicle Type', options: ['', 'Truck', 'Van'] },
          { key: 'status', label: 'Status', options: ['', 'AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'] },
          { key: 'region', label: 'Region', options: ['', 'North', 'South', 'East', 'West'] },
        ].map(({ key, label, options }) => (
          <select
            key={key}
            value={filters[key]}
            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="">{label}: All</option>
            {options.filter(Boolean).map((o) => (
              <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
            ))}
          </select>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={18} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Route</th>
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Driver</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTrips.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No trips yet</td></tr>
                ) : recentTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-slate-900 dark:text-white">{t.source}</span>
                      <span className="text-slate-400 mx-1.5">→</span>
                      <span className="text-slate-700 dark:text-slate-300">{t.destination}</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{t.vehicle?.name}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{t.driver?.name}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={t.status} /></td>
                    <td className="px-6 py-3.5 text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Fleet Status Chart */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Fleet Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
