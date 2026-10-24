import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LandingPage } from './pages/LandingPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { QuickBookingPage } from './pages/QuickBookingPage';
import { ConciergePage } from './pages/ConciergePage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { SetupPasswordPage } from './pages/SetupPasswordPage';
import { DemoAdminDashboardPage } from './pages/DemoAdminDashboardPage';
import { SuperAdminApprovalPage } from './pages/SuperAdminApprovalPage';
import { Toaster } from 'sonner';
import { SHOW_PRODUCTION_AUTH } from './config';

// Protected Route Guard requiring customer authentication
const ProtectedCustomerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('appointmo_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

// Protected Admin / Owner Route Guard for production management
const ProtectedOwnerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('appointmo_token');
  const user = JSON.parse(localStorage.getItem('appointmo_user') || '{}');
  if (!token || (user.role !== 'owner' && user.role !== 'platform_admin')) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Routes>
        {/* 1. Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* 2. Customer Booking & Experiences (Secured for authentic accounts) */}
        <Route path="/browse" element={<DiscoveryPage />} />
        <Route path="/discover" element={<DiscoveryPage />} />
        <Route
          path="/demo/book"
          element={
            <ProtectedCustomerRoute>
              <QuickBookingPage />
            </ProtectedCustomerRoute>
          }
        />
        <Route
          path="/book"
          element={
            <ProtectedCustomerRoute>
              <QuickBookingPage />
            </ProtectedCustomerRoute>
          }
        />
        <Route path="/demo/concierge" element={<ConciergePage />} />
        <Route path="/concierge" element={<ConciergePage />} />

        {/* 3. Interactive Admin (Isolated Fictional Demo Business) */}
        <Route
          path="/demo/admin"
          element={
            <ProtectedOwnerRoute>
              <DemoAdminDashboardPage />
            </ProtectedOwnerRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedOwnerRoute>
              <DemoAdminDashboardPage />
            </ProtectedOwnerRoute>
          }
        />

        {/* 4. Customer Secure Booking Lookup & Management */}
        <Route
          path="/customer/portal"
          element={
            <ProtectedCustomerRoute>
              <CustomerPortalPage />
            </ProtectedCustomerRoute>
          }
        />
        <Route
          path="/manage"
          element={
            <ProtectedCustomerRoute>
              <CustomerPortalPage />
            </ProtectedCustomerRoute>
          }
        />

        {/* 5. Production Authentication (Hidden from public links, but functional) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/setup-password" element={<SetupPasswordPage />} />
        <Route
          path="/owner/access-requests"
          element={
            <ProtectedOwnerRoute>
              <OwnerDashboardPage />
            </ProtectedOwnerRoute>
          }
        />
        <Route
          path="/admin/platform"
          element={
            <ProtectedOwnerRoute>
              <SuperAdminApprovalPage />
            </ProtectedOwnerRoute>
          }
        />
        <Route
          path="/superadmin"
          element={
            <ProtectedOwnerRoute>
              <SuperAdminApprovalPage />
            </ProtectedOwnerRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        theme="system"
        toastOptions={{
          style: { borderRadius: '1rem', padding: '0.875rem 1rem' }
        }}
      />
    </ThemeProvider>
  );
};
