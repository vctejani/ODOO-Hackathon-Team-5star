import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Route, Wrench, Fuel,
  BarChart3, LogOut, Moon, Sun, Menu, X, Bell, UserPlus,
  CheckCircle2, AlertTriangle, Info, Calendar, Circle, Check, AlertCircle
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleLabel, formatDate } from '../lib/utils';
import { NAV_ITEMS, getNavForRole } from '../lib/permissions';
import api from '../lib/api';

const ICONS = {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  UserPlus,
  Calendar,
};

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Truck, label: 'Vehicles' },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/trips', icon: Route, label: 'Trips' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/expenses', icon: Fuel, label: 'Fuel & Expenses' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/employees', icon: UserPlus, label: 'Employees', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`/notifications/${id}/action`, { action });
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action.toLowerCase()} trip`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = useMemo(() => {
    const items = getNavForRole(user?.role);
    return items.map((item) => ({ ...item, icon: ICONS[item.icon] }));
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      <div className="px-5 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="TransitOps Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">TransitOps</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Fleet Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || user?.role === 'FLEET_MANAGER')
          .map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel(user?.role)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggle} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <NavContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 flex flex-col shadow-2xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={20} />
            </button>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu size={20} />
            </button>
            <div className="hidden sm:block" />
            <div className="flex items-center gap-3 relative animate-in fade-in duration-200">
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={`relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all duration-200 ${notifOpen ? 'bg-slate-105 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Header */}
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-xs text-slate-900 dark:text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{unreadCount} unread</p>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-[11px] text-brand-600 dark:text-brand-450 hover:underline font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-450 dark:text-slate-500">
                            <Info size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                            <p className="text-xs font-semibold">All caught up!</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            let Icon = Info;
                            let iconColor = 'text-slate-500 bg-slate-100 dark:bg-slate-800/60 dark:text-slate-455';
                            if (notif.type === 'LICENSE_EXPIRY') {
                              Icon = AlertTriangle;
                              iconColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400';
                            } else if (notif.type === 'TRIP_ASSIGNED') {
                              Icon = Calendar;
                              iconColor = 'text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400';
                            } else if (notif.type === 'TRIP_STATUS') {
                              Icon = CheckCircle2;
                              iconColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400';
                            } else if (notif.type.includes('DELETE')) {
                              Icon = AlertCircle;
                              iconColor = 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400';
                            }

                            return (
                              <div
                                key={notif.id}
                                onClick={() => !notif.read && markRead(notif.id)}
                                className={`p-4 flex gap-3 cursor-pointer transition-colors ${notif.read ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/30' : 'bg-brand-50/10 dark:bg-brand-900/10 hover:bg-brand-50/20 dark:hover:bg-brand-900/20'}`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}>
                                  <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{notif.title}</h4>
                                    <span className="text-[9px] text-slate-400 shrink-0 mt-0.5">{formatDate(notif.createdAt)}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 leading-normal break-words">{notif.message}</p>
                                  
                                  {notif.actionable && (
                                    <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      {!notif.actionDone ? (
                                        <>
                                          <button
                                            onClick={() => handleAction(notif.id, 'APPROVE')}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm shadow-emerald-600/10"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleAction(notif.id, 'CANCEL')}
                                            className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-55 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                                          >
                                            Reject
                                          </button>
                                        </>
                                      ) : (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9px] font-semibold border border-slate-200/50 dark:border-slate-750">
                                          Action Completed
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {!notif.read && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-650 dark:bg-brand-500 shrink-0 self-center" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400">
                {roleLabel(user?.role)}
              </span>
            </div>
          </div>
        </header>
        <main className="px-4 sm:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
