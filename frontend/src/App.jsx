import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Extinguishers from './pages/Extinguishers';
import Inspections from './pages/Inspections';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';

function AppLayout({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR', 'USER']}><Dashboard /></AppLayout>} />
          <Route path="/extinguishers" element={<AppLayout allowedRoles={['ADMIN', 'USER']}><Extinguishers /></AppLayout>} />
          <Route path="/inspections" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR', 'USER']}><Inspections /></AppLayout>} />
          <Route path="/maintenance" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR']}><Maintenance /></AppLayout>} />
          <Route path="/reports" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR']}><Reports /></AppLayout>} />
          <Route path="/notifications" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR', 'USER']}><Notifications /></AppLayout>} />
          <Route path="/profile" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR', 'USER']}><Profile /></AppLayout>} />
          <Route path="/change-password" element={<AppLayout allowedRoles={['ADMIN', 'INSPECTOR', 'USER']}><ChangePassword /></AppLayout>} />
          <Route path="/users" element={<ProtectedRoute adminOnly><Layout><Users /></Layout></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
