import { useEffect, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import api from '../lib/api';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner, EmptyState } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const [error, setError] = useState('');

  const canEdit = user?.role === 'FLEET_MANAGER';

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
    try {
      await api.post('/maintenance', form);
      setModal(false);
      setForm({ vehicleId: '', description: '', cost: '' });
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
        subtitle="Track vehicle maintenance and service records"
        action={canEdit && (
          <Button onClick={() => setModal(true)}><Plus size={16} /> New Maintenance</Button>
        )}
      />

      {logs.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="No maintenance records" description="Create a maintenance log when a vehicle needs service" /></Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
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
          <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) — {v.status.replace(/_/g, ' ')}</option>
            ))}
          </Select>
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
