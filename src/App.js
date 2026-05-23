import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import SalesPage from './pages/Sales/SalesPage';
import InventoryPage from './pages/Inventory/InventoryPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import ImportPage from './pages/Import/ImportPage';
import AIInsightsPage from './pages/AIInsights/AIInsightsPage';
import CustomersPage from './pages/Customers/CustomersPage';
import ManualEntryPage from './pages/ManualEntry/ManualEntryPage';
import TablesPage from './pages/Tables/TablesPage';
import SeedScreen from './components/ui/SeedScreen';

export default function App() {
  const [seeded, setSeeded] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const statusFn = window.electron?.db?.getSeedStatus;
    if (!statusFn) {
      setSeeded(true);
      setChecking(false);
      return;
    }

    statusFn()
      .then(s => { setSeeded(s?.seeded ?? true); setChecking(false); })
      .catch(() => { setSeeded(true); setChecking(false); });
  }, []);

  if (checking) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0B0F1A'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid #14B8A6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{color:'#94A3B8',fontSize:13,fontFamily:'monospace'}}>Starting Kanthi Textiles...</p>
      </div>
    </div>
  );

  if (!seeded) return <ThemeProvider><SeedScreen onSeeded={() => setSeeded(true)} /></ThemeProvider>;

  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{
          style:{background:'var(--bg-card)',color:'var(--text-primary)',border:'1px solid var(--border)',borderRadius:10,fontSize:13},
          success:{iconTheme:{primary:'#10B981',secondary:'transparent'}},
          error:{iconTheme:{primary:'#EF4444',secondary:'transparent'}},
        }} />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sales/*" element={<SalesPage />} />
            <Route path="customers/*" element={<CustomersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="analytics/*" element={<AnalyticsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="manual-entry" element={<ManualEntryPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
