import { useEffect, useState } from 'react';
import { Plus, Search, Users, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner, EmptyState } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Drivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', licenseNumber: '', licenseCategory: 'B',
    licenseExpiry: '', contactNumber: '', safetyScore: '100',
  });
  const [error, setError] = useState('');

  const canEdit = ['FLEET_MANAGER', 'SAFETY_OFFICER'].includes(user?.role);

  const fetchDrivers = () => {
    api.get('/drivers').then((res) => setDrivers(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDrivers(); }, []);

  const filtered = drivers.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.licenseNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/drivers', form);
      setModal(false);
      setForm({ name: '', licenseNumber: '', licenseCategory: 'B', licenseExpiry: '', contactNumber: '', safetyScore: '100' });
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create driver');
    }
  };

  const toggleSuspend = async (driver) => {
    const newStatus = driver.status === 'SUSPENDED' ? 'AVAILABLE' : 'SUSPENDED';
    await api.put(`/drivers/${driver.id}`, { status: newStatus });
    fetchDrivers();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Driver Management"
        subtitle="Track driver profiles, licenses, and safety scores"
        action={canEdit && (
          <Button onClick={() => setModal(true)}><Plus size={16} /> Add Driver</Button>
        )}
      />

      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title="No drivers found" description="Register drivers to assign them to trips" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-3">Driver</th>
                  <th className="px-6 py-3">License</th>
                  <th className="px-6 py-3">Expiry</th>
                  <th className="px-6 py-3">Safety Score</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Status</th>
                  {canEdit && <th className="px-6 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                          {d.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-600 dark:text-slate-400">{d.licenseNumber}</span>
                      <span className="ml-2 text-xs text-slate-400">Cat. {d.licenseCategory}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {!d.licenseValid && <AlertTriangle size={14} className="text-red-500" />}
                        {d.licenseExpiringSoon && d.licenseValid && <AlertTriangle size={14} className="text-amber-500" />}
                        <span className={!d.licenseValid ? 'text-red-500' : d.licenseExpiringSoon ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400'}>
                          {formatDate(d.licenseExpiry)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className={`h-full rounded-full ${d.safetyScore >= 90 ? 'bg-emerald-500' : d.safetyScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${d.safetyScore}%` }} />
                        </div>
                        <span className="text-slate-600 dark:text-slate-400">{d.safetyScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{d.contactNumber}</td>
                    <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                    {canEdit && (
                      <td className="px-6 py-4">
                        <Button variant="ghost" className="text-xs" onClick={() => toggleSuspend(d)}>
                          {d.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Register New Driver" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="License Number" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required />
            <Select label="License Category" value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })}>
              {['A', 'B', 'C', 'B+C', 'C+E'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="License Expiry" type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} required />
            <Input label="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} required />
            <Input label="Safety Score" type="number" min="0" max="100" value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Register Driver</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
