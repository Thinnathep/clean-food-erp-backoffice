import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { useAuthStore } from './store/authStore';
import { supabase } from './config/supabase';
import { Toaster } from 'sonner';

// Lazy-loaded routes for optimal loading speed and code-splitting
const Login = lazy(() => import('./features/auth/Login').then(m => ({ default: m.Login })));
const KdsDashboard = lazy(() => import('./features/kds/components/KdsDashboard').then(m => ({ default: m.KdsDashboard })));
const ProductionOrderPanel = lazy(() => import('./features/kds/components/ProductionOrderPanel').then(m => ({ default: m.ProductionOrderPanel })));
const KdsChecklistView = lazy(() => import('./features/kds/components/KdsDashboard/views/KdsChecklistView').then(m => ({ default: m.KdsChecklistView })));
const FoodSafetyLog = lazy(() => import('./features/kds/components/FoodSafetyLog').then(m => ({ default: m.FoodSafetyLog })));
const DemandForecastView = lazy(() => import('./features/kds/components/DemandForecastView').then(m => ({ default: m.DemandForecastView })));
const KdsPackagingView = lazy(() => import('./features/kds/components/KdsDashboard/views/KdsPackagingView').then(m => ({ default: m.KdsPackagingView })));

const MemberManagement = lazy(() => import('./features/members/components/MemberManagement').then(m => ({ default: m.MemberManagement })));
const PromotionManagement = lazy(() => import('./features/members/components/PromotionManagement').then(m => ({ default: m.PromotionManagement })));

const InventoryPage = lazy(() => import('./features/inventory/components/InventoryPage').then(m => ({ default: m.InventoryPage })));
const IngredientMasterPage = lazy(() => import('./features/inventory/components/IngredientMasterPage').then(m => ({ default: m.IngredientMasterPage })));

const MenuManagement = lazy(() => import('./features/menu/components/MenuManagement').then(m => ({ default: m.MenuManagement })));
const MenuSettings = lazy(() => import('./features/menu/components/MenuSettings').then(m => ({ default: m.MenuSettings })));

const FinanceDashboard = lazy(() => import('./features/finance/components/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));

const LogisticsDashboard = lazy(() => import('./features/logistics/components/LogisticsDashboard').then(m => ({ default: m.LogisticsDashboard })));
const ShippingCalculator = lazy(() => import('./features/logistics/components/ShippingCalculator').then(m => ({ default: m.ShippingCalculator })));
const RouteManagement = lazy(() => import('./features/logistics/components/RouteManagement').then(m => ({ default: m.RouteManagement })));
const DropPointManagement = lazy(() => import('./features/logistics/components/DropPointManagement').then(m => ({ default: m.DropPointManagement })));
const DeliverySettings = lazy(() => import('./features/logistics/components/DeliverySettings').then(m => ({ default: m.DeliverySettings })));

const ProcurementDashboard = lazy(() => import('./features/procurement/components/ProcurementDashboard').then(m => ({ default: m.ProcurementDashboard })));
const OrderCalculator = lazy(() => import('./features/calculator/components/OrderCalculator').then(m => ({ default: m.OrderCalculator })));
const SettingsPage = lazy(() => import('./features/auth/SettingsPage').then(m => ({ default: m.SettingsPage })));
const UserManualPage = lazy(() => import('./features/guide/components/UserManualPage').then(m => ({ default: m.UserManualPage })));

const PageLoader: React.FC = () => (
  <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    <p className="text-xs font-medium text-slate-400 font-prompt animate-pulse">กำลังโหลดข้อมูล...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-prompt">
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
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/kds" replace />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            )
          } 
        />
        
        <Route path="/" element={<Navigate to="/kds" replace />} />
        
        {/* Protected ERP Routes */}
        <Route path="/kds" element={<ProtectedRoute><MainLayout><KdsDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/production" element={<ProtectedRoute><MainLayout><ProductionOrderPanel /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/checklist" element={<ProtectedRoute><MainLayout><KdsChecklistView /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/haccp" element={<ProtectedRoute><MainLayout><FoodSafetyLog /></MainLayout></ProtectedRoute>} />
        <Route path="/kds/forecast" element={<ProtectedRoute><MainLayout><DemandForecastView /></MainLayout></ProtectedRoute>} />
        
        <Route path="/members" element={<ProtectedRoute><MainLayout><MemberManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/promotions" element={<ProtectedRoute><MainLayout><PromotionManagement /></MainLayout></ProtectedRoute>} />
        
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
        
        <Route path="/procurement" element={<ProtectedRoute><MainLayout><ProcurementDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/procurement/receiving" element={<ProtectedRoute><MainLayout><ProcurementDashboard initialTab="gr" /></MainLayout></ProtectedRoute>} />
        
        <Route path="/calculator" element={<ProtectedRoute><MainLayout><OrderCalculator /></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/manual" element={<ProtectedRoute><MainLayout><UserManualPage /></MainLayout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
