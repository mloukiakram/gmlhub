import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PMTAMonitor from './pages/tools/PMTAMonitor';
import VMTADuplicate from './pages/tools/VMTADuplicate';
import AuraRemover from './pages/tools/AuraRemover';
import BounceCleaner from './pages/tools/BounceCleaner';
import BucketTool from './pages/tools/BucketTool';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7f9]">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7f9]">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/tools/pmta-monitor" replace /> : <Login />} />

      {/* Admin Routes */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-panel" element={<AdminDashboard />} />

      <Route path="/tools" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="vmta-duplicate" replace />} />
        <Route path="pmta-monitor" element={<PMTAMonitor />} />
        <Route path="vmta-duplicate" element={<VMTADuplicate />} />
        <Route path="aura-remover" element={<AuraRemover />} />
        <Route path="bounce-cleaner" element={<BounceCleaner />} />
        <Route path="bucket-tool" element={<BucketTool />} />
      </Route>

      <Route path="/" element={<Navigate to="/tools/vmta-duplicate" replace />} />
      <Route path="*" element={<Navigate to="/tools/vmta-duplicate" replace />} />
    </Routes>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './context/ThemeContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch just because I clicked away
      retry: 1,
      staleTime: 5 * 60 * 1000, // Data stays "fresh" for 5 minutes (instant loads)
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
