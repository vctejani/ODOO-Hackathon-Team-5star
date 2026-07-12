import { useEffect, useState } from 'react';
import { Plus, Wrench, Search } from 'lucide-react';
import api from '../lib/api';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner, EmptyState } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { canManageMaintenance } from '../lib/permissions';

export default function Maintenance() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    const term = searchQuery.toLowerCase();
    return !searchQuery ||
      log.description.toLowerCase().includes(term) ||
      (log.vehicle?.name && log.vehicle.name.toLowerCase().includes(term)) ||
      (log.vehicle?.registrationNumber && log.vehicle.registrationNumber.toLowerCase().includes(term));
  });

  const filteredVehiclesForSelection = vehicles.filter(v => {
    const term = vehicleQuery.toLowerCase();
    const isSelected = vehicles.some(x => `${x.name} (${x.registrationNumber})` === vehicleQuery && x.id === form.vehicleId);
    return isSelected || !vehicleQuery ||
      v.name.toLowerCase().includes(term) ||
      v.registrationNumber.toLowerCase().includes(term);
  });

  const canEdit = canManageMaintenance(user?.role);

  const fetchData = async () => {
    const [logsRes, vehiclesRes] = await Promise.all([
      api.get('/maintenance'),
      api.get('/vehicles'),
    ]);
    setLogs(logsRes.data);
    setVehicles(vehiclesRes.data.filter((v) => v.status !== 'RETIRED'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.vehicleId) {
      setError('Please select a vehicle from the dropdown list.');
      return;
    }
    try {
      await api.post('/maintenance', form);
      setModal(false);
      setForm({ vehicleId: '', description: '', cost: '' });
      setVehicleQuery('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create maintenance record');
    }
  };

  const handleClose = async (id) => {
    try {
      await api.post(`/maintenance/${id}/close`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close maintenance');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Maintenance Logs"
        subtitle={canEdit ? 'Track vehicle maintenance and service records' : 'Review maintenance costs and service history'}
        action={canEdit && (
          <Button onClick={() => {
            setVehicleQuery('');
            setVehicleDropdownOpen(false);
            setForm({ vehicleId: '', description: '', cost: '' });
            setModal(true);
          }}><Plus size={16} /> New Maintenance</Button>
        )}
      />

      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search logs description or vehicle..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none"
        />
      </div>

      {filteredLogs.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="No maintenance records found" description="Adjust your search filter or create a new log" /></Card>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{log.description}</h3>
                    <StatusBadge status={log.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-5 text-sm text-slate-500 dark:text-slate-400">
                    <span>Vehicle: <strong className="text-slate-700 dark:text-slate-300">{log.vehicle?.name}</strong> ({log.vehicle?.registrationNumber})</span>
                    <span>Cost: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(log.cost)}</strong></span>
                    <span>Started: {formatDate(log.startDate)}</span>
                    {log.endDate && <span>Closed: {formatDate(log.endDate)}</span>}
                  </div>
                </div>
                {canEdit && log.status === 'ACTIVE' && (
                  <Button variant="success" onClick={() => handleClose(log.id)}>Close Maintenance</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Create Maintenance Record">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Select vehicle..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                value={vehicleQuery}
                onChange={(e) => {
                  setVehicleQuery(e.target.value);
                  setForm(f => ({ ...f, vehicleId: '' }));
                  setVehicleDropdownOpen(true);
                }}
                onFocus={() => setVehicleDropdownOpen(true)}
                onBlur={() => setTimeout(() => setVehicleDropdownOpen(false), 250)}
              />
              <button 
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
              >
                <Search size={16} />
              </button>
            </div>
            {vehicleDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                {filteredVehiclesForSelection.length === 0 ? (
                  <div className="px-4 py-2.5 text-sm text-slate-500">No vehicles found</div>
                ) : (
                  filteredVehiclesForSelection.map((v) => (
                    <div
                      key={v.id}
                      className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer"
                      onMouseDown={() => {
                        setVehicleQuery(`${v.name} (${v.registrationNumber})`);
                        setForm(f => ({ ...f, vehicleId: v.id }));
                        setVehicleDropdownOpen(false);
                      }}
                    >
                      {v.name} ({v.registrationNumber}) — {v.status.replace(/_/g, ' ')}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Oil Change" required />
          <Input label="Estimated Cost ($)" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
            Creating a maintenance record will automatically set the vehicle status to "In Shop".
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Create Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
