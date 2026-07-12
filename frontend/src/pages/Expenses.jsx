import { useEffect, useState } from 'react';
import { Plus, Fuel, Save, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner } from '../components/UI';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { canManageExpenses } from '../lib/permissions';

export default function Expenses() {
  const { user } = useAuth();
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [fuelPrice, setFuelPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('vehicle');
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    vehicleName: '',
    vehicleId: '',
    type: 'TOLL',
    amount: '',
    liters: '',
    description: '',
    date: ''
  });
  const [expandedVehicles, setExpandedVehicles] = useState({});

  const toggleVehicle = (vehicleId) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

  const canEdit = canManageExpenses(user?.role);
  const priceNum = parseFloat(fuelPrice) || 0;

  const fetchData = async () => {
    const [fuelRes, expRes, vehRes, priceRes] = await Promise.all([
      api.get('/expenses/fuel'),
      api.get('/expenses/expenses'),
      api.get('/vehicles'),
      api.get('/expenses/fuel-price'),
    ]);
    setFuelLogs(fuelRes.data);
    setExpenses(expRes.data);
    setVehicles(vehRes.data);
    setFuelPrice(String(priceRes.data.pricePerLiter));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveFuelPrice = async () => {
    setSavingPrice(true);
    try {
      await api.put('/expenses/fuel-price', { pricePerLiter: parseFloat(fuelPrice) });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save fuel price');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSavingExpense(true);
    try {
      if (expenseForm.type === 'FUEL') {
        const litersNum = parseFloat(expenseForm.liters) || 0;
        const calculatedFuelCost = priceNum > 0 && litersNum > 0
          ? Math.round(litersNum * priceNum * 100) / 100
          : 0;

        await api.post('/expenses/fuel', {
          vehicleId: expenseForm.vehicleId,
          liters: litersNum,
          cost: calculatedFuelCost,
          date: expenseForm.date || undefined,
        });
      } else {
        await api.post('/expenses/expenses', {
          vehicleId: expenseForm.vehicleId,
          type: expenseForm.type,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          date: expenseForm.date || undefined,
        });
      }
      setExpenseModal(false);
      setExpenseForm({ vehicleName: '', vehicleId: '', type: 'TOLL', amount: '', liters: '', description: '', date: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const otherExpenses = expenses.filter((e) => e.type !== 'FUEL');
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalExpenses = otherExpenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return null;

  return (
    <div>
      <PageHeader
        title="Fuel & Expense Management"
        subtitle="Track fuel consumption and operational expenses"
        action={canEdit && (
          <Button onClick={() => {
            setExpenseForm({ vehicleName: '', vehicleId: '', type: 'TOLL', amount: '', liters: '', description: '', date: '' });
            setExpenseModal(true);
          }}><Plus size={16} /> Add Expense</Button>
        )}
      />

      {canEdit && (
        <Card className="p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Input
                label="Current Fuel Price ($/liter)"
                type="number"
                step="0.01"
                min="0.01"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                placeholder="e.g. 1.50"
              />
            </div>
            <Button onClick={handleSaveFuelPrice} disabled={savingPrice || !fuelPrice}>
              <Save size={16} /> {savingPrice ? 'Saving...' : 'Save Fuel Price'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            Fuel log costs are calculated automatically: <strong>Cost = Liters × Price/L</strong>
          </p>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Fuel Cost</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totalFuelCost)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Other Expenses</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totalExpenses)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Combined Operational Cost</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{formatCurrency(totalFuelCost + totalExpenses)}</p>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        {['vehicle', 'fuel', 'expenses'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            {t === 'vehicle' ? 'Vehicle Breakdown' : t === 'fuel' ? 'Fuel Logs' : 'Other Expenses'}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                {tab === 'fuel' ? (
                  <><th className="px-6 py-3">Date</th><th className="px-6 py-3">Vehicle</th><th className="px-6 py-3">Liters</th><th className="px-6 py-3">Cost</th></>
                ) : tab === 'expenses' ? (
                  <><th className="px-6 py-3">Date</th><th className="px-6 py-3">Vehicle</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Amount</th></>
                ) : (
                  <><th className="px-6 py-3">Vehicle Name</th><th className="px-6 py-3">Registration Number</th><th className="px-6 py-3 text-right">Total Fuel Cost</th><th className="px-6 py-3 text-right">Other Total Cost</th><th className="px-6 py-3 text-right">Total Expenses</th><th className="px-6 py-3 text-right">Details</th></>
                )}
              </tr>
            </thead>
            {tab === 'vehicle' ? (
              vehicles.length === 0 ? (
                <tbody>
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No vehicles available</td></tr>
                </tbody>
              ) : (
                vehicles.map((v) => {
                  const vehicleFuel = fuelLogs.filter(f => f.vehicleId === v.id);
                  const vehicleExp = otherExpenses.filter(e => e.vehicleId === v.id);
                  const totalFuel = vehicleFuel.reduce((sum, f) => sum + f.cost, 0);
                  const totalOther = vehicleExp.reduce((sum, e) => sum + e.amount, 0);
                  const combinedTotal = totalFuel + totalOther;

                  const allDetailedExpenses = [
                    ...vehicleFuel.map(f => ({ id: f.id, date: f.date, type: 'FUEL', amount: f.cost, details: `${f.liters}L @ $${(f.liters > 0 ? f.cost / f.liters : 0).toFixed(2)}/L` })),
                    ...vehicleExp.map(e => ({ id: e.id, date: e.date, type: e.type, amount: e.amount, details: e.description }))
                  ].sort((a, b) => new Date(b.date) - new Date(a.date));

                  const isExpanded = !!expandedVehicles[v.id];

                  return (
                    <tbody key={v.id} className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => toggleVehicle(v.id)}>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {v.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{v.registrationNumber}</td>
                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{formatCurrency(totalFuel)}</td>
                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{formatCurrency(totalOther)}</td>
                        <td className="px-6 py-4 text-right font-bold text-brand-600">{formatCurrency(combinedTotal)}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs text-right">
                          {allDetailedExpenses.length} transaction{allDetailedExpenses.length !== 1 ? 's' : ''}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/50 dark:bg-slate-800/20 px-8 py-4">
                            {allDetailedExpenses.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-2">No expenses recorded for this vehicle</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                                      <th className="pb-2 font-medium">Date</th>
                                      <th className="pb-2 font-medium">Type</th>
                                      <th className="pb-2 font-medium">Details</th>
                                      <th className="pb-2 font-medium text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {allDetailedExpenses.map((x) => (
                                      <tr key={x.id}>
                                        <td className="py-2">{formatDate(x.date)}</td>
                                        <td className="py-2">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            x.type === 'FUEL' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                          }`}>
                                            {x.type}
                                          </span>
                                        </td>
                                        <td className="py-2 text-slate-500 truncate max-w-xs">{x.details || '—'}</td>
                                        <td className="py-2 font-semibold text-right">{formatCurrency(x.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              )
            ) : (
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tab === 'fuel' ? (
                  fuelLogs.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400"><Fuel size={32} className="mx-auto mb-2 opacity-50" />No fuel logs yet</td></tr>
                  ) : fuelLogs.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3.5">{formatDate(f.date)}</td>
                      <td className="px-6 py-3.5 font-medium">{f.vehicle?.name}</td>
                      <td className="px-6 py-3.5">{f.liters} L</td>
                      <td className="px-6 py-3.5">{formatCurrency(f.cost)}</td>
                    </tr>
                  ))
                ) : (
                  otherExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No expenses recorded</td></tr>
                  ) : otherExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3.5">{formatDate(e.date)}</td>
                      <td className="px-6 py-3.5 font-medium">{e.vehicle?.name}</td>
                      <td className="px-6 py-3.5"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800">{e.type}</span></td>
                      <td className="px-6 py-3.5 text-slate-500">{e.description || '—'}</td>
                      <td className="px-6 py-3.5 font-medium">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>
      </Card>

      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Add Expense">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Select 
            label="Vehicle Model/Name" 
            value={expenseForm.vehicleName} 
            onChange={(e) => {
              setExpenseForm({ 
                ...expenseForm, 
                vehicleName: e.target.value, 
                vehicleId: '' 
              });
            }} 
            required
          >
            <option value="">Select model/name</option>
            {[...new Set(vehicles.map((v) => v.name))].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>

          <Select 
            label="Registration Number" 
            value={expenseForm.vehicleId} 
            onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })} 
            disabled={!expenseForm.vehicleName}
            required
          >
            <option value="">Select registration number</option>
            {vehicles
              .filter((v) => v.name === expenseForm.vehicleName)
              .map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber}</option>
              ))}
          </Select>

          <Select label="Type" value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
            {['FUEL', 'TOLL', 'MAINTENANCE', 'OTHER'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>

          {expenseForm.type === 'FUEL' ? (
            <>
              <Input 
                label="Liters" 
                type="number" 
                step="0.1" 
                value={expenseForm.liters} 
                onChange={(e) => setExpenseForm({ ...expenseForm, liters: e.target.value })} 
                required 
              />
              <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Calculated Cost</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(priceNum * (parseFloat(expenseForm.liters) || 0))}
                  {(parseFloat(expenseForm.liters) || 0) > 0 && priceNum > 0 && (
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      ({expenseForm.liters} L × ${priceNum}/L)
                    </span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <>
              <Input 
                label="Amount ($)" 
                type="number" 
                value={expenseForm.amount} 
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} 
                required 
              />
              <Input 
                label="Description" 
                value={expenseForm.description} 
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} 
              />
            </>
          )}

          <Input 
            label="Date" 
            type="date" 
            value={expenseForm.date} 
            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} 
            max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setExpenseModal(false)}>Cancel</Button>
            <Button type="submit" disabled={savingExpense}>{savingExpense ? 'Saving...' : 'Save Expense'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
