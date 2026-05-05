// Rebuild forced after fixing inventory types
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { KdsDashboard } from './features/kds/components/KdsDashboard';
import { MemberManagement } from './features/members/components/MemberManagement';
import { InventoryPage } from './features/inventory/components/InventoryPage';
import { IngredientMasterPage } from './features/inventory/components/IngredientMasterPage';
import { Login } from './features/auth/Login';
import { useAuthStore } from './store/authStore';
import { supabase } from './config/supabase';
import { Toaster } from 'sonner';
import { FinanceDashboard } from './features/finance/components/FinanceDashboard';
import { MenuManagement } from './features/menu/components/MenuManagement';
import { LogisticsDashboard } from './features/logistics/components/LogisticsDashboard';


// Re-saved to ensure all imports are matched correctly

// Re-saved to ensure all imports are matched correctly

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const { isAuthenticated, isInitializing, setUser } = useAuthStore();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Admin User',
          role: session.user.user_metadata?.role || 'ADMIN'
        });
      } else {
        setUser(null);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Admin User',
          role: session.user.user_metadata?.role || 'ADMIN'
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-normal animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster richColors closeButton position="top-right" />
      <Routes>

        <Route path="/login" element={isAuthenticated ? <Navigate to="/kds" replace /> : <Login />} />
        
        <Route path="/" element={<Navigate to="/kds" replace />} />
        
        {/* Protected ERP Routes */}
        <Route path="/kds" element={<ProtectedRoute><MainLayout><KdsDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><MainLayout><MemberManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/items" element={<ProtectedRoute><MainLayout><IngredientMasterPage /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stock" element={<ProtectedRoute><MainLayout><InventoryPage /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<Navigate to="/inventory/stock" replace />} />
        
        <Route path="/menu/member" element={<ProtectedRoute><MainLayout><MenuManagement type="member" /></MainLayout></ProtectedRoute>} />
        <Route path="/menu/retail" element={<ProtectedRoute><MainLayout><MenuManagement type="retail" /></MainLayout></ProtectedRoute>} />
        <Route path="/menu" element={<Navigate to="/menu/member" replace />} />

        <Route path="/finance" element={<ProtectedRoute><MainLayout><FinanceDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics" element={<ProtectedRoute><MainLayout><LogisticsDashboard /></MainLayout></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
