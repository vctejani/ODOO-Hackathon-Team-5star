import { useEffect, useState } from 'react';
import { Plus, Route, Send, CheckCircle, XCircle, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [driverQuery, setDriverQuery] = useState('');

  const filteredTrips = trips.filter((t) => {
    const term = searchQuery.toLowerCase();
    return !searchQuery || 
      t.source.toLowerCase().includes(term) ||
      t.destination.toLowerCase().includes(term) ||
      (t.vehicle?.name && t.vehicle.name.toLowerCase().includes(term)) ||
      (t.vehicle?.registrationNumber && t.vehicle.registrationNumber.toLowerCase().includes(term)) ||
      (t.driver?.name && t.driver.name.toLowerCase().includes(term));
  });

  const filteredVehiclesForSelection = vehicles.filter(v => {
    const term = vehicleQuery.toLowerCase();
    const isSelected = vehicles.some(x => `${x.name} (${x.registrationNumber})` === vehicleQuery && x.id === form.vehicleId);
    return isSelected || !vehicleQuery ||
      v.name.toLowerCase().includes(term) ||
      v.registrationNumber.toLowerCase().includes(term);
  });

  const filteredDriversForSelection = drivers.filter(d => {
    const term = driverQuery.toLowerCase();
    const isSelected = drivers.some(x => `${x.name} (${x.licenseNumber})` === driverQuery && x.id === form.driverId);
    return isSelected || !driverQuery ||
      d.name.toLowerCase().includes(term) ||
      d.licenseNumber.toLowerCase().includes(term);
  });

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

    if (!form.vehicleId) {
      setError('Please select an available vehicle from the dropdown list.');
      return;
    }
    if (!form.driverId) {
      setError('Please select an available driver from the dropdown list.');
      return;
    }

    try {
      await api.post('/trips', form);
      setModal(false);
      setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '', revenue: '' });
      setVehicleQuery('');
      setDriverQuery('');
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
          <Button onClick={() => {
            setVehicleQuery('');
            setDriverQuery('');
            setVehicleDropdownOpen(false);
            setDriverDropdownOpen(false);
            setModal(true);
          }}><Plus size={16} /> Create Trip</Button>
        )}
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trips (source, dest, driver, vehicle)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
          <option value="">All Statuses</option>
          {['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {filteredTrips.length === 0 ? (
        <Card><EmptyState icon={Route} title="No trips found" description="Create a trip or adjust your search filter" /></Card>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((t) => (
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
                    <span>Vehicle: <strong className="text-slate-700 dark:text-slate-300">{t.vehicle?.name} ({t.vehicle?.registrationNumber})</strong></span>
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
            <div className="relative space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select available vehicle..."
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
                        {v.name} ({v.registrationNumber}) — {v.maxLoadCapacity}kg
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Driver</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select available driver..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  value={driverQuery}
                  onChange={(e) => {
                    setDriverQuery(e.target.value);
                    setForm(f => ({ ...f, driverId: '' }));
                    setDriverDropdownOpen(true);
                  }}
                  onFocus={() => setDriverDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDriverDropdownOpen(false), 250)}
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setDriverDropdownOpen(!driverDropdownOpen)}
                >
                  <Search size={16} />
                </button>
              </div>
              {driverDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                  {filteredDriversForSelection.length === 0 ? (
                    <div className="px-4 py-2.5 text-sm text-slate-500">No drivers found</div>
                  ) : (
                    filteredDriversForSelection.map((d) => (
                      <div
                        key={d.id}
                        className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer"
                        onMouseDown={() => {
                          setDriverQuery(`${d.name} (${d.licenseNumber})`);
                          setForm(f => ({ ...f, driverId: d.id }));
                          setDriverDropdownOpen(false);
                        }}
                      >
                        {d.name} ({d.licenseNumber})
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
