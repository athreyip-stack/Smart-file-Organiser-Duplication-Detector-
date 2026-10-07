import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useScan } from './context/ScanContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';
import FilesPage from './pages/FilesPage';
import DuplicatesPage from './pages/DuplicatesPage';
import OrganizePage from './pages/OrganizePage';
import AnalyticsPage from './pages/AnalyticsPage';
import CleanupPage from './pages/CleanupPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { systemService } from './services/systemService';

export default function App() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { startScan, refreshScans } = useScan();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState(null); // 'login', 'register', or null (use app)

  const handleQuickSandbox = async () => {
    try {
      const res = await systemService.createSampleSandbox();
      await startScan(res.sandbox_path);
      await refreshScans();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to create demo sandbox:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mr-2" />
        Loading Sortiva...
      </div>
    );
  }

  // If user requested login or register screen
  if (authView === 'login') {
    return (
      <Login
        onSwitchToRegister={() => setAuthView('register')}
        onContinueGuest={() => setAuthView(null)}
      />
    );
  }

  if (authView === 'register') {
    return (
      <Register
        onSwitchToLogin={() => setAuthView('login')}
        onContinueGuest={() => setAuthView(null)}
      />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onQuickSandbox={handleQuickSandbox}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          setActiveTab={setActiveTab}
          onOpenScanModal={() => setActiveTab('scan')}
          onQuickSandbox={handleQuickSandbox}
        />
      )}

      {activeTab === 'scan' && (
        <ScanPage
          setActiveTab={setActiveTab}
          onQuickSandbox={handleQuickSandbox}
        />
      )}

      {activeTab === 'files' && (
        <FilesPage
          setActiveTab={setActiveTab}
          onOpenScanModal={() => setActiveTab('scan')}
        />
      )}

      {activeTab === 'duplicates' && (
        <DuplicatesPage
          setActiveTab={setActiveTab}
          onOpenScanModal={() => setActiveTab('scan')}
        />
      )}

      {activeTab === 'organize' && (
        <OrganizePage
          setActiveTab={setActiveTab}
          onOpenScanModal={() => setActiveTab('scan')}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsPage
          setActiveTab={setActiveTab}
          onOpenScanModal={() => setActiveTab('scan')}
        />
      )}

      {activeTab === 'cleanup' && (
        <CleanupPage
          setActiveTab={setActiveTab}
          onOpenScanModal={() => setActiveTab('scan')}
        />
      )}

      {activeTab === 'history' && <HistoryPage />}

      {activeTab === 'settings' && <SettingsPage />}
    </Layout>
  );
}
