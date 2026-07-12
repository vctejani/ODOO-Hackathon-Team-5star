import { useEffect, useState } from 'react';
import { Download, FileText, TrendingUp, Fuel, DollarSign, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import { Button, Card, PageHeader, LoadingSpinner } from '../components/UI';
import { formatCurrency } from '../lib/utils';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    api.get('/reports/analytics')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Vehicle ROI Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">ROI = (Revenue - Operational Cost) / Acquisition Cost × 100</p>
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
              {vehicleAnalytics.map((v) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
