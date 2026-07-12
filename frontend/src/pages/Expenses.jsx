import { useEffect, useState } from 'react';
import { Plus, Fuel } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('fuel');
  const [fuelModal, setFuelModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelForm, setFuelForm] = useState({ vehicleId: '', liters: '', cost: '', date: '' });
  const [expenseForm, setExpenseForm] = useState({ vehicleId: '', type: 'TOLL', amount: '', description: '', date: '' });

  const canEdit = canManageExpenses(user?.role);

  const fetchData = async () => {
    const [fuelRes, expRes, vehRes] = await Promise.all([
      api.get('/expenses/fuel'),
      api.get('/expenses/expenses'),
      api.get('/vehicles'),
    ]);
    setFuelLogs(fuelRes.data);
    setExpenses(expRes.data);
    setVehicles(vehRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    await api.post('/expenses/fuel', fuelForm);
    setFuelModal(false);
    setFuelForm({ vehicleId: '', liters: '', cost: '', date: '' });
    fetchData();
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    await api.post('/expenses/expenses', expenseForm);
    setExpenseModal(false);
    setExpenseForm({ vehicleId: '', type: 'TOLL', amount: '', description: '', date: '' });
    fetchData();
  };

  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return null;

  return (
    <div>
      <PageHeader
        title="Fuel & Expense Management"
        subtitle="Track fuel consumption and operational expenses"
        action={canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setExpenseModal(true)}><Plus size={16} /> Add Expense</Button>
            <Button onClick={() => setFuelModal(true)}><Plus size={16} /> Log Fuel</Button>
          </div>
        )}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Fuel Cost</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totalFuelCost)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totalExpenses)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Combined Operational Cost</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{formatCurrency(totalFuelCost + totalExpenses)}</p>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        {['fuel', 'expenses'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            {t === 'fuel' ? 'Fuel Logs' : 'Other Expenses'}
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
                ) : (
                  <><th className="px-6 py-3">Date</th><th className="px-6 py-3">Vehicle</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Amount</th></>
                )}
              </tr>
            </thead>
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
                expenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No expenses recorded</td></tr>
                ) : expenses.map((e) => (
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
          </table>
        </div>
      </Card>

      <Modal open={fuelModal} onClose={() => setFuelModal(false)} title="Log Fuel">
        <form onSubmit={handleFuelSubmit} className="space-y-4">
          <Select label="Vehicle" value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })} required>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Input label="Liters" type="number" value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} required />
          <Input label="Cost ($)" type="number" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} required />
          <Input label="Date" type="date" value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFuelModal(false)}>Cancel</Button>
            <Button type="submit">Save Fuel Log</Button>
          </div>
        </form>
      </Modal>

      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Add Expense">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Select label="Vehicle" value={expenseForm.vehicleId} onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })} required>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Select label="Type" value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
            {['TOLL', 'MAINTENANCE', 'OTHER'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Amount ($)" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
          <Input label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          <Input label="Date" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setExpenseModal(false)}>Cancel</Button>
            <Button type="submit">Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
