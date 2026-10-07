import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useScan } from '../../context/ScanContext';
import { systemService } from '../../services/systemService';
import Modal from '../common/Modal';

export default function Layout({ activeTab, setActiveTab, children }) {
  const { startScan, refreshScans } = useScan();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxMessage, setSandboxMessage] = useState(null);

  const handleQuickSandbox = async () => {
    setSandboxLoading(true);
    try {
      const res = await systemService.createSampleSandbox();
      setSandboxMessage(`Demo sandbox created at: ${res.sandbox_path}`);
      // Automatically scan this sandbox
      await startScan(res.sandbox_path);
      await refreshScans();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to create demo sandbox:', err);
    } finally {
      setSandboxLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Sticky Top Navbar */}
      <Navbar
        onOpenScanModal={() => setActiveTab('scan')}
        onQuickSandbox={handleQuickSandbox}
      />

      {/* Main App Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {sandboxLoading && (
            <div className="mb-4 p-3 bg-slate-900 text-amber-300 rounded-xl text-xs flex items-center gap-2 shadow-sm animate-pulse">
              <div className="w-3.5 h-3.5 border-2 border-amber-300/40 border-t-amber-300 rounded-full animate-spin" />
              <span>Generating real test files with exact duplicates in sandbox folder...</span>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
