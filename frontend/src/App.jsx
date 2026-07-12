import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ClickSpark from './components/ClickSpark';
import TargetCursor from './components/TargetCursor';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import { LoadingSpinner } from './components/UI';
import { canAccessRoute, ROLE_HOME } from './lib/permissions';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ path, children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  if (!canAccessRoute(path, user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<RoleRoute path="/dashboard"><Dashboard /></RoleRoute>} />
        <Route path="vehicles" element={<RoleRoute path="/vehicles"><Vehicles /></RoleRoute>} />
        <Route path="drivers" element={<RoleRoute path="/drivers"><Drivers /></RoleRoute>} />
        <Route path="trips" element={<RoleRoute path="/trips"><Trips /></RoleRoute>} />
        <Route path="maintenance" element={<RoleRoute path="/maintenance"><Maintenance /></RoleRoute>} />
        <Route path="expenses" element={<RoleRoute path="/expenses"><Expenses /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute path="/reports"><Reports /></RoleRoute>} />
        <Route path="employees" element={<RoleRoute path="/employees"><Employees /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TargetCursor
            targetSelector=".cursor-target, a, button, [role='button'], input:not([type='hidden']), select, textarea"
            spinDuration={2}
            hideDefaultCursor
            parallaxOn
            cursorColor="#ffffff"
            cursorColorOnTarget="#60a5fa"
          />
          <ClickSpark
            sparkColor="#2563eb"
            sparkSize={22}
            sparkRadius={80}
            sparkCount={8}
            duration={400}
          >
            <div className="min-h-screen w-full">
              <AppRoutes />
            </div>
          </ClickSpark>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
