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
import { MenuSettings } from './features/menu/components/MenuSettings';
import { LogisticsDashboard } from './features/logistics/components/LogisticsDashboard';
import { ShippingCalculator } from './features/logistics/components/ShippingCalculator';
import { RouteManagement } from './features/logistics/components/RouteManagement';
import { DropPointManagement } from './features/logistics/components/DropPointManagement';
import { PromotionManagement } from './features/members/components/PromotionManagement';
import { SettingsPage } from './features/auth/SettingsPage';
import { ProcurementDashboard } from './features/procurement/components/ProcurementDashboard';
import { ProductionOrderPanel } from './features/kds/components/ProductionOrderPanel';
import { FoodSafetyLog } from './features/kds/components/FoodSafetyLog';
import { DemandForecastView } from './features/kds/components/DemandForecastView';
import { KdsChecklistView } from './features/kds/components/KdsDashboard/views/KdsChecklistView';
import { KdsPackagingView } from './features/kds/components/KdsDashboard/views/KdsPackagingView';
import { OrderCalculator } from './features/calculator/components/OrderCalculator';
import { DeliverySettings } from './features/logistics/components/DeliverySettings';

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
        useAuthStore.getState().logout();
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
        <Route path="/kds/production" element={<ProtectedRoute><MainLayout><ProductionOrderPanel /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/checklist" element={<ProtectedRoute><MainLayout><KdsChecklistView /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/haccp" element={<ProtectedRoute><MainLayout><FoodSafetyLog /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/forecast" element={<ProtectedRoute><MainLayout><DemandForecastView /></MainLayout></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><MainLayout><MemberManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/items" element={<ProtectedRoute><MainLayout><IngredientMasterPage /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stock" element={<ProtectedRoute><MainLayout><InventoryPage /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<Navigate to="/inventory/stock" replace />} />
        
        <Route path="/menu/member" element={<ProtectedRoute><MainLayout><MenuManagement type="member" /></MainLayout></ProtectedRoute>} />
        <Route path="/menu/retail" element={<ProtectedRoute><MainLayout><MenuManagement type="retail" /></MainLayout></ProtectedRoute>} />
        <Route path="/menu/settings" element={<ProtectedRoute><MainLayout><MenuSettings /></MainLayout></ProtectedRoute>} />
        <Route path="/menu" element={<Navigate to="/menu/member" replace />} />

        <Route path="/finance" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="overview" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/history" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="history" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/income" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="income" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/expense" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="expense" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/cash_recon" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="cash_recon" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/invoices" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="invoices" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/pl" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="pl" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/customers" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="customers" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/promotions" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="promotions" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/simulator" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="simulator" /></MainLayout></ProtectedRoute>} />
        <Route path="/finance/settings" element={<ProtectedRoute><MainLayout><FinanceDashboard initialTab="settings" /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics" element={<ProtectedRoute><MainLayout><LogisticsDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics/packing" element={<ProtectedRoute><MainLayout><KdsPackagingView /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics/calculator" element={<ProtectedRoute><MainLayout><ShippingCalculator /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics/routes" element={<ProtectedRoute><MainLayout><RouteManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics/drop-points" element={<ProtectedRoute><MainLayout><DropPointManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/logistics/delivery-settings" element={<ProtectedRoute><MainLayout><DeliverySettings /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/recipes" element={<ProtectedRoute><MainLayout><div className="p-8 text-slate-500">Recipe/BOM Management - Coming Soon</div></MainLayout></ProtectedRoute>} />
        
        {/* Calculator */}
        <Route path="/calculator" element={<ProtectedRoute><MainLayout><OrderCalculator /></MainLayout></ProtectedRoute>} />
        
        <Route path="/promotions" element={<ProtectedRoute><MainLayout><PromotionManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/procurement" element={<ProtectedRoute><MainLayout><ProcurementDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/procurement/receiving" element={<ProtectedRoute><MainLayout><ProcurementDashboard initialTab="gr" /></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
