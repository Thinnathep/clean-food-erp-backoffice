import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { KdsDashboard } from './features/kds/components/KdsDashboard';
import { MemberManagement } from './features/members/components/MemberManagement';
import { Login } from './features/auth/Login';
import { useAuthStore } from './store/authStore';

// Placeholder Pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center opacity-50 p-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-slate-500 font-bold mt-2">กำลังอยู่ในช่วงการพัฒนา (Phase 3+)</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/kds" replace /> : <Login />} />
        
        <Route path="/" element={<Navigate to="/kds" replace />} />
        
        {/* Protected ERP Routes */}
        <Route path="/kds" element={<ProtectedRoute><MainLayout><KdsDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><MainLayout><MemberManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><MainLayout><PlaceholderPage title="ระบบคลังวัตถุดิบ & สูตรอาหาร" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><MainLayout><PlaceholderPage title="ระบบบัญชีและการเงิน" /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics" element={<ProtectedRoute><MainLayout><PlaceholderPage title="ระบบจัดการไรเดอร์ส่งอาหาร" /></MainLayout></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
