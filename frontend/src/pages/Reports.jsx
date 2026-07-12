import { useEffect, useState } from 'react';
import { Download, FileText, TrendingUp, Fuel, DollarSign, FileDown, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import { Button, Card, PageHeader, LoadingSpinner } from '../components/UI';
import { formatCurrency } from '../lib/utils';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = vehicleTypeFilter ? `?vehicleType=${vehicleTypeFilter}` : '';
    api.get(`/reports/analytics${params}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vehicleTypeFilter]);

  const exportCSV = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/reports/export/csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transitops-report.csv';
    a.click();
  };

  const exportVehiclePDF = async (vehicleId, registrationNumber) => {
    setDownloadingId(vehicleId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reports/export/pdf/vehicle/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TransitOps-${registrationNumber}-Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download vehicle report');
    } finally {
      setDownloadingId(null);
    }
  };

  const exportPDF = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/reports/export/pdf', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `TransitOps-Fleet-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { fleetUtilization, totalOperationalCost, avgFuelEfficiency, vehicleAnalytics, expenseBreakdown } = data;

  const filteredVehicles = vehicleAnalytics.filter(v =>
    !searchQuery ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Operational insights, fuel efficiency, and ROI analysis"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
            <Button onClick={exportPDF}><FileText size={16} /> Export PDF</Button>
          </div>
        }
      />

      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500">Filter Vehicle Type:</label>
          <select 
            value={vehicleTypeFilter} 
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">All Types</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Bus">Bus</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Fleet Utilization', value: `${fleetUtilization}%`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
          { label: 'Operational Cost', value: formatCurrency(totalOperationalCost), icon: DollarSign, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
          { label: 'Avg Fuel Efficiency', value: `${avgFuelEfficiency} km/L`, icon: Fuel, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Vehicles Tracked', value: vehicleAnalytics.length, icon: TrendingUp, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={expenseBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Fuel Efficiency by Vehicle</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vehicleAnalytics.filter((v) => v.fuelEfficiency > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="registrationNumber" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="fuelEfficiency" fill="#14b8a6" radius={[6, 6, 0, 0]} name="km/L" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Vehicle ROI Analysis</h3>
            <p className="text-xs text-slate-500 mt-0.5">ROI = (Revenue - Operational Cost) / Acquisition Cost × 100</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicles by name or reg..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-3">Vehicle</th>
                <th className="px-6 py-3">Fuel Cost</th>
                <th className="px-6 py-3">Maint. Cost</th>
                <th className="px-6 py-3">Op. Cost</th>
                <th className="px-6 py-3">Distance</th>
                <th className="px-6 py-3">Efficiency</th>
                <th className="px-6 py-3">Revenue</th>
                <th className="px-6 py-3">ROI</th>
                <th className="px-6 py-3">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No vehicles match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-slate-900 dark:text-white">{v.name}</span>
                      <span className="block text-xs text-slate-400 font-mono">{v.registrationNumber}</span>
                    </td>
                    <td className="px-6 py-3.5">{formatCurrency(v.fuelCost)}</td>
                    <td className="px-6 py-3.5">{formatCurrency(v.maintenanceCost)}</td>
                    <td className="px-6 py-3.5 font-medium">{formatCurrency(v.operationalCost)}</td>
                    <td className="px-6 py-3.5">{v.totalDistance} km</td>
                    <td className="px-6 py-3.5">{v.fuelEfficiency} km/L</td>
                    <td className="px-6 py-3.5">{formatCurrency(v.revenue)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`font-semibold ${v.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {v.roi}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Button
                        variant="secondary"
                        className="text-xs py-1.5 px-3"
                        disabled={downloadingId === v.id}
                        onClick={() => exportVehiclePDF(v.id, v.registrationNumber)}
                      >
                        <FileDown size={14} />
                        {downloadingId === v.id ? 'Generating…' : 'Download PDF'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
