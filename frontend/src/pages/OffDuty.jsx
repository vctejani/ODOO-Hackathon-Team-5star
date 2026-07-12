import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, PageHeader, Modal, Input } from '../components/UI';

export default function OffDuty() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [managerTab, setManagerTab] = useState('pending'); // 'pending' | 'history'

  const isManager = user?.role === 'FLEET_MANAGER';

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/off-duty');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch off-duty requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);

    if (start >= end) {
      setError('Start date/time must be before end date/time.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/off-duty', form);
      setModalOpen(false);
      setForm({ startDate: '', endDate: '', reason: '' });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit off-duty request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
    try {
      await api.put(`/off-duty/${id}/status`, { status });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update request status.');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const historyRequests = requests.filter((r) => r.status !== 'PENDING');

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30';
      case 'DECLINED':
        return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-800/30';
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'DECLINED':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-amber-500 animate-pulse" />;
    }
  };

  // Indian Date Time string helper for HTML max/min
  const getMinDateTime = () => {
    const d = new Date();
    // Offset for IST (GMT +5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const localIst = new Date(d.getTime() + istOffset);
    return localIst.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Off-Duty & Leaves"
        subtitle={isManager ? "Review and manage employee leave and off-duty schedules." : "Request off-duty periods and track approval status."}
        action={!isManager && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> Request Off-Duty
          </Button>
        )}
      />

      {isManager && (
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px mb-4">
          <button
            onClick={() => setManagerTab('pending')}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
              managerTab === 'pending'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Pending Review ({pendingRequests.length})
          </button>
          <button
            onClick={() => setManagerTab('history')}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
              managerTab === 'history'
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Request History ({historyRequests.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Clock className="animate-spin text-brand-600" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Requests Listing */}
          {(isManager ? (managerTab === 'pending' ? pendingRequests : historyRequests) : requests).length === 0 ? (
            <Card className="p-8">
              <div className="text-center py-6">
                <Calendar className="mx-auto text-slate-400 mb-3" size={40} />
                <h4 className="font-semibold text-slate-900 dark:text-white">No off-duty requests</h4>
                <p className="text-slate-500 text-sm mt-1">
                  {isManager ? "No requests are available under this section." : "Submit an off-duty request using the button above."}
                </p>
              </div>
            </Card>
          ) : (
            (isManager ? (managerTab === 'pending' ? pendingRequests : historyRequests) : requests).map((req) => (
              <Card key={req.id} className="p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {isManager && (
                        <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">
                          {req.user?.name} ({req.user?.role.replace(/_/g, ' ')})
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(req.status)}`}>
                        {getStatusIcon(req.status)}
                        {req.status}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="text-slate-700 dark:text-slate-300">
                        Start: <strong className="text-slate-900 dark:text-white">{formatDateTime(req.startDate)}</strong>
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        End: <strong className="text-slate-900 dark:text-white">{formatDateTime(req.endDate)}</strong>
                      </p>
                      {req.reason && (
                        <p className="text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/30">
                          Reason: "{req.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  {isManager && req.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button variant="success" onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}>Approve</Button>
                      <Button variant="danger" onClick={() => handleUpdateStatus(req.id, 'DECLINED')}>Decline</Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* New Request Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Off-Duty Request">
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <Input
            label="Start Date & Time"
            type="datetime-local"
            min={getMinDateTime()}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
          <Input
            label="End Date & Time"
            type="datetime-local"
            min={form.startDate || getMinDateTime()}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason / Description</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder="Provide a reason for leave..."
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
