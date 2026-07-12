import { useEffect, useState } from 'react';
import { Plus, Route, Send, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner, EmptyState } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { canManageTrips } from '../lib/permissions';

export default function Trips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeight: '', plannedDistance: '', revenue: '',
  });
  const [completeForm, setCompleteForm] = useState({ finalOdometer: '', fuelConsumed: '', actualDistance: '' });
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(0);
  const [error, setError] = useState('');

  const canManage = canManageTrips(user?.role);
  const fuelLiters = parseFloat(completeForm.fuelConsumed) || 0;
  const estimatedFuelCost = fuelLiters > 0 && fuelPricePerLiter > 0
    ? Math.round(fuelLiters * fuelPricePerLiter * 100) / 100
    : 0;

  const fetchData = async () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const [tripsRes, vehiclesRes, driversRes, priceRes] = await Promise.all([
      api.get(`/trips${params}`),
      api.get('/vehicles/available'),
      api.get('/drivers/available'),
      api.get('/expenses/fuel-price').catch(() => ({ data: { pricePerLiter: 1.5 } })),
    ]);
    setTrips(tripsRes.data);
    setVehicles(vehiclesRes.data);
    setDrivers(driversRes.data);
    setFuelPricePerLiter(priceRes.data.pricePerLiter);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', form);
      setModal(false);
      setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '', revenue: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trip');
    }
  };

  const handleDispatch = async (id) => {
    try {
      await api.post(`/trips/${id}/dispatch`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Dispatch failed');
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/trips/${completeModal}/complete`, completeForm);
      setCompleteModal(null);
      setCompleteForm({ finalOdometer: '', fuelConsumed: '', actualDistance: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Complete failed');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this trip?')) return;
    try {
      await api.post(`/trips/${id}/cancel`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancel failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Trip Management"
        subtitle={canManage ? 'Create, dispatch, and track deliveries' : 'Monitor active and pending deliveries'}
        action={canManage && (
          <Button onClick={() => setModal(true)}><Plus size={16} /> Create Trip</Button>
        )}
      />

      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
        className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm mb-6">
        <option value="">All Statuses</option>
        {['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>

      {trips.length === 0 ? (
        <Card><EmptyState icon={Route} title="No trips yet" description="Create a trip to start dispatching" /></Card>
      ) : (
        <div className="space-y-4">
          {trips.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {t.source} → {t.destination}
                    </h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <span>Vehicle: <strong className="text-slate-700 dark:text-slate-300">{t.vehicle?.name}</strong></span>
                    <span>Driver: <strong className="text-slate-700 dark:text-slate-300">{t.driver?.name}</strong></span>
                    <span>Cargo: <strong className="text-slate-700 dark:text-slate-300">{t.cargoWeight} kg</strong></span>
                    <span>Distance: <strong className="text-slate-700 dark:text-slate-300">{t.plannedDistance} km</strong></span>
                    <span>Created: {formatDate(t.createdAt)}</span>
                  </div>
                </div>
                {(() => {
                  const isDriver = user?.role === 'DRIVER';
                  const isAssignedToMe = isDriver && (t.driver?.userId === user?.id || t.driver?.licenseNumber === user?.licenseNumber || t.driver?.name === user?.name);
                  const showActions = user?.role === 'FLEET_MANAGER' || isAssignedToMe;

                  if (!showActions) return null;

                  return (
                    <div className="flex gap-2">
                      {t.status === 'DRAFT' && (
                        <>
                          <Button onClick={() => handleDispatch(t.id)} className="flex items-center gap-1">
                            {isDriver ? <CheckCircle size={14} /> : <Send size={14} />} 
                            {isDriver ? 'Approve' : 'Dispatch'}
                          </Button>
                          <Button variant="danger" onClick={() => handleCancel(t.id)} className="flex items-center gap-1">
                            <XCircle size={14} /> 
                            {isDriver ? 'Reject' : 'Cancel'}
                          </Button>
                        </>
                      )}
                      {t.status === 'DISPATCHED' && (
                        <>
                          <Button variant="success" onClick={() => setCompleteModal(t.id)} className="flex items-center gap-1">
                            <CheckCircle size={14} /> Complete
                          </Button>
                          <Button variant="danger" onClick={() => handleCancel(t.id)} className="flex items-center gap-1">
                            <XCircle size={14} /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Create New Trip" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required />
            <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
            <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
              <option value="">Select available vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) — {v.maxLoadCapacity}kg</option>
              ))}
            </Select>
            <Select label="Driver" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} required>
              <option value="">Select available driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.licenseNumber})</option>
              ))}
            </Select>
            <Input label="Cargo Weight (kg)" type="number" value={form.cargoWeight} onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })} required />
            <Input label="Planned Distance (km)" type="number" value={form.plannedDistance} onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })} required />
            <Input label="Revenue ($)" type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Create Trip</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!completeModal} onClose={() => setCompleteModal(null)} title="Complete Trip">
        <form onSubmit={handleComplete} className="space-y-4">
          <Input label="Final Odometer (km)" type="number" value={completeForm.finalOdometer} onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })} required />
          <Input label="Fuel Consumed (liters)" type="number" step="0.1" value={completeForm.fuelConsumed} onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumed: e.target.value })} />
          {fuelLiters > 0 && (
            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated Fuel Cost</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(estimatedFuelCost)}
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({fuelLiters} L × ${fuelPricePerLiter}/L)
                </span>
              </p>
            </div>
          )}
          <Input label="Actual Distance (km)" type="number" value={completeForm.actualDistance} onChange={(e) => setCompleteForm({ ...completeForm, actualDistance: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCompleteModal(null)}>Cancel</Button>
            <Button type="submit" variant="success">Complete Trip</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
