import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Users, UserPlus, Shield, DollarSign, Trash2, Search, Filter, Mail, Lock, Phone, UserCheck, AlertCircle, FileCheck
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, PageHeader, Modal, Input, Select, LoadingSpinner, EmptyState } from '../components/UI';
import { roleLabel, formatDate } from '../lib/utils';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initial empty form state
  const initialFormState = {
    name: '',
    email: '',
    password: '',
    role: 'DRIVER',
    contactNumber: '',
    // Driver-specific
    licenseNumber: '',
    licenseCategory: 'B',
    licenseExpiry: '',
    safetyScore: '100',
    // Safety Officer-specific
    certificationNumber: '',
    safetyRegion: 'North',
    // Financial Analyst-specific
    employeeId: '',
    department: '',
  };

  const [form, setForm] = useState(initialFormState);

  // Restrict page to Fleet Manager
  if (user?.role !== 'FLEET_MANAGER') {
    return <Navigate to="/" replace />;
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Build clean payload with only necessary fields for selected role
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        contactNumber: form.contactNumber,
      };

      if (form.role === 'DRIVER') {
        payload.licenseNumber = form.licenseNumber;
        payload.licenseCategory = form.licenseCategory;
        payload.licenseExpiry = form.licenseExpiry;
        payload.safetyScore = form.safetyScore;
      } else if (form.role === 'SAFETY_OFFICER') {
        payload.certificationNumber = form.certificationNumber;
        payload.safetyRegion = form.safetyRegion;
      } else if (form.role === 'FINANCIAL_ANALYST') {
        payload.employeeId = form.employeeId;
        payload.department = form.department;
      }

      await api.post('/users', payload);
      setSuccess('Employee added successfully!');
      setForm(initialFormState);
      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? This will also affect their access to log in.')) {
      return;
    }
    try {
      await api.delete(`/users/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  // Stats computation
  const stats = {
    total: employees.length,
    drivers: employees.filter((e) => e.role === 'DRIVER').length,
    safetyOfficers: employees.filter((e) => e.role === 'SAFETY_OFFICER').length,
    analysts: employees.filter((e) => e.role === 'FINANCIAL_ANALYST').length,
  };

  // Filter & Search logic
  const filtered = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage user accounts, system access levels, and role-specific details."
        action={
          <Button onClick={() => { setError(''); setSuccess(''); setModalOpen(true); }} className="flex items-center gap-2">
            <UserPlus size={16} /> Add Employee
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total Employees</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Users size={22} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Drivers</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.drivers}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <UserCheck size={22} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Safety Officers</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.safetyOfficers}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Shield size={22} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Financial Analysts</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.analysts}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign size={22} />
          </div>
        </Card>
      </div>

      {/* Directory Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 hidden sm:block" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="FLEET_MANAGER">Fleet Manager</option>
            <option value="DRIVER">Driver</option>
            <option value="SAFETY_OFFICER">Safety Officer</option>
            <option value="FINANCIAL_ANALYST">Financial Analyst</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Users} title="No employees found" description="No results match your search and filter criteria." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-850">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Credentials & Metadata</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">{emp.name}</span>
                          <span className="text-xs text-slate-400 font-mono block">{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.role === 'FLEET_MANAGER' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        emp.role === 'DRIVER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        emp.role === 'SAFETY_OFFICER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {roleLabel(emp.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {emp.contactNumber || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        {emp.role === 'DRIVER' && (
                          <>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">License: <span className="font-mono bg-slate-100 dark:bg-slate-850 px-1 rounded">{emp.licenseNumber || 'N/A'}</span></p>
                            <p className="text-slate-400">Cat: {emp.licenseCategory} | Exp: {formatDate(emp.licenseExpiry)} | Safety Score: <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.safetyScore ?? '100'}</span></p>
                          </>
                        )}
                        {emp.role === 'SAFETY_OFFICER' && (
                          <>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">Cert: <span className="font-mono bg-slate-100 dark:bg-slate-850 px-1 rounded">{emp.certificationNumber || 'N/A'}</span></p>
                            <p className="text-slate-400">Region: {emp.safetyRegion}</p>
                          </>
                        )}
                        {emp.role === 'FINANCIAL_ANALYST' && (
                          <>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">Emp ID: <span className="font-mono bg-slate-100 dark:bg-slate-850 px-1 rounded">{emp.employeeId || 'N/A'}</span></p>
                            <p className="text-slate-400">Dept: {emp.department}</p>
                          </>
                        )}
                        {emp.role === 'FLEET_MANAGER' && (
                          <p className="text-slate-400 italic">Full Platform Access</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      {formatDate(emp.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {emp.email !== user.email ? (
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic px-2">You (Active)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Employee Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register New Employee" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 animate-shake">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common Fields */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <UserCheck size={14} /> Basic Account Info
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="johndoe@transitops.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <div className="relative">
                  <Input
                    label="Temporary Password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <Lock size={14} className="absolute right-3 top-10.5 text-slate-400" />
                </div>
                <div className="relative">
                  <Input
                    label="Contact Number"
                    placeholder="+1 (555) 000-0000"
                    value={form.contactNumber}
                    onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  />
                  <Phone size={14} className="absolute right-3 top-10.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileCheck size={14} /> Organization Role & Parameters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Job Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="DRIVER">Driver</option>
                  <option value="SAFETY_OFFICER">Safety Officer</option>
                  <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                  <option value="FLEET_MANAGER">Fleet Manager (Admin)</option>
                </Select>
              </div>
            </div>

            {/* Dynamic Role-Specific Fields */}
            {form.role === 'DRIVER' && (
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-200">
                <Input
                  label="License Number"
                  placeholder="DL-XXXXXXXX"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  required
                />
                <Select
                  label="License Category"
                  value={form.licenseCategory}
                  onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })}
                >
                  {['A', 'B', 'C', 'B+C', 'C+E'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
                <Input
                  label="License Expiry"
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                  required
                />
                <Input
                  label="Safety Score"
                  type="number"
                  min="0"
                  max="100"
                  value={form.safetyScore}
                  onChange={(e) => setForm({ ...form, safetyScore: e.target.value })}
                />
              </div>
            )}

            {form.role === 'SAFETY_OFFICER' && (
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-200">
                <Input
                  label="Safety Certification Number"
                  placeholder="CERT-SF-XXXX"
                  value={form.certificationNumber}
                  onChange={(e) => setForm({ ...form, certificationNumber: e.target.value })}
                  required
                />
                <Select
                  label="Assigned Safety Region"
                  value={form.safetyRegion}
                  onChange={(e) => setForm({ ...form, safetyRegion: e.target.value })}
                >
                  <option value="North">North Region</option>
                  <option value="South">South Region</option>
                  <option value="East">East Region</option>
                  <option value="West">West Region</option>
                </Select>
              </div>
            )}

            {form.role === 'FINANCIAL_ANALYST' && (
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-200">
                <Input
                  label="Financial Analyst Employee ID"
                  placeholder="EMP-FA-XXXX"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  required
                />
                <Input
                  label="Cost Department"
                  placeholder="e.g. Accounts, Operations, Auditing"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-850">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
