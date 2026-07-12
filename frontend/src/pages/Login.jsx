import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI';
import { ROLE_HOME } from '../lib/permissions';

const demoAccounts = [
  { role: 'Fleet Manager', email: 'fleet@transitops.com' },
  { role: 'Driver', email: 'driver@transitops.com' },
  { role: 'Safety Officer', email: 'safety@transitops.com' },
  { role: 'Financial Analyst', email: 'finance@transitops.com' },
];

export default function Login() {
  const [email, setEmail] = useState('fleet@transitops.com');
  const [password, setPassword] = useState('password123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(ROLE_HOME[loggedInUser.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Truck size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight">TransitOps</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Transport<br />Operations Platform
          </h1>
          <p className="text-brand-200 text-lg max-w-md leading-relaxed">
            Digitize vehicle, driver, dispatch, maintenance, and expense management with real-time operational insights.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-md">
            {['Fleet Management', 'Trip Dispatch', 'Maintenance Tracking', 'Analytics & Reports'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-brand-200">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">TransitOps</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="relative">
                <Input label="Password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Demo Accounts</p>
              <div className="space-y-2">
                {demoAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => { setEmail(a.email); setPassword('password123'); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-slate-700 dark:text-slate-300">{a.role}</span>
                    <span className="text-xs text-slate-400">{a.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">Password: password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
