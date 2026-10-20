import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { RedeemInvitePage } from './pages/RedeemInvitePage';
import { QuickBookingPage } from './pages/QuickBookingPage';
import { ConciergePage } from './pages/ConciergePage';
import { ManageBookingPage } from './pages/ManageBookingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { PlatformAdminPage } from './pages/PlatformAdminPage';
import { BusinessDashboardPage } from './pages/BusinessDashboardPage';

// Protected Route Guard for Private Demo Access
const ProtectedDemoRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('appointmo_token');
  if (!token) {
    return <Navigate to="/demo/redeem" replace />;
  }
  return children;
};

// Protected Admin Route Guard
const ProtectedAdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('appointmo_token');
  const user = JSON.parse(localStorage.getItem('appointmo_user') || '{}');
  if (!token || (user.role !== 'platform_admin' && user.role !== 'business_admin')) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo/redeem" element={<RedeemInvitePage />} />
      <Route path="/manage" element={<ManageBookingPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Interactive Demo Routes */}
      <Route
        path="/demo/book"
        element={
          <ProtectedDemoRoute>
            <QuickBookingPage />
          </ProtectedDemoRoute>
        }
      />
      <Route
        path="/concierge"
        element={
          <ProtectedDemoRoute>
            <ConciergePage />
          </ProtectedDemoRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/admin/platform"
        element={
          <ProtectedAdminRoute>
            <PlatformAdminPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdminRoute>
            <BusinessDashboardPage />
          </ProtectedAdminRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
