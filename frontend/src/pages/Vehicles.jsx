import { useEffect, useState } from 'react';
import { Plus, Search, Truck } from 'lucide-react';
import api from '../lib/api';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner, EmptyState } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { canManageVehicles } from '../lib/permissions';

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    registrationNumber: '', name: '', type: 'Van', maxLoadCapacity: '',
    odometer: '', acquisitionCost: '', region: 'North',
  });
  const [error, setError] = useState('');

  const canEdit = canManageVehicles(user?.role);

  const fetchVehicles = () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    api.get(`/vehicles?${params}`).then((res) => setVehicles(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVehicles(); }, [filterStatus]);

  const filtered = vehicles.filter((v) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.registrationNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const registrationNumberUpper = form.registrationNumber.trim().toUpperCase();
    try {
      await api.post('/vehicles', {
        ...form,
        registrationNumber: registrationNumberUpper,
      });
      setModal(false);
      setForm({ registrationNumber: '', name: '', type: 'Van', maxLoadCapacity: '', odometer: '', acquisitionCost: '', region: 'North' });
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create vehicle');
    }
  };

  const handleRetire = async (id) => {
    if (!confirm('Retire this vehicle?')) return;
    await api.delete(`/vehicles/${id}`);
    fetchVehicles();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        subtitle={canEdit ? 'Manage fleet assets and vehicle lifecycle' : 'View fleet assets for cost analysis'}
        action={canEdit && (
          <Button onClick={() => setModal(true)}><Plus size={16} /> Add Vehicle</Button>
        )}
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicles..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
          <option value="">All Statuses</option>
          {['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Truck} title="No vehicles found" description="Add your first vehicle to get started" /></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <Card key={v.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{v.name}</h3>
                  <p className="text-sm text-slate-500 font-mono">{v.registrationNumber}</p>
                </div>
                <StatusBadge status={v.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Type</span><p className="font-medium text-slate-700 dark:text-slate-300">{v.type}</p></div>
                <div><span className="text-slate-400">Region</span><p className="font-medium text-slate-700 dark:text-slate-300">{v.region}</p></div>
                <div><span className="text-slate-400">Capacity</span><p className="font-medium text-slate-700 dark:text-slate-300">{v.maxLoadCapacity} kg</p></div>
                <div><span className="text-slate-400">Odometer</span><p className="font-medium text-slate-700 dark:text-slate-300">{v.odometer.toLocaleString()} km</p></div>
                <div className="col-span-2"><span className="text-slate-400">Acquisition Cost</span><p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(v.acquisitionCost)}</p></div>
              </div>
              {canEdit && v.status !== 'RETIRED' && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" className="text-xs text-red-500" onClick={() => handleRetire(v.id)}>Retire Vehicle</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Register New Vehicle" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Registration Number" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })} required />
            <Input label="Vehicle Name/Model" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
              <option value="Bus">Bus</option>
            </Select>
            <Select label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
              {['North', 'South', 'East', 'West'].map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Input label="Max Load Capacity (kg)" type="number" value={form.maxLoadCapacity} onChange={(e) => setForm({ ...form, maxLoadCapacity: e.target.value })} required />
            <Input label="Odometer (km)" type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
            <Input label="Acquisition Cost ($)" type="number" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Register Vehicle</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
