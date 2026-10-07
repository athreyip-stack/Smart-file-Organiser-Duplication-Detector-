import React, { useState, useEffect } from 'react';
import {
  Files,
  HardDrive,
  Copy,
  FolderTree,
  ArrowRight,
  FolderSearch,
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { storageService } from '../services/storageService';
import { operationService } from '../services/operationService';
import { formatBytes, formatDate } from '../utils/formatters';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import StoragePieChart from '../components/dashboard/StoragePieChart';
import FileCountBarChart from '../components/dashboard/FileCountBarChart';
import RecentActivityList from '../components/dashboard/RecentActivityList';

export default function Dashboard({ setActiveTab, onOpenScanModal, onQuickSandbox }) {
  const { currentScan, isScanning } = useScan();
  const [storageData, setStorageData] = useState(null);
  const [recentOperations, setRecentOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentScan) return;
      setLoading(true);
      try {
        const [storageRes, opsRes] = await Promise.all([
          storageService.getStorageSummary(currentScan.id),
          operationService.getOperations(null, 10),
        ]);
        setStorageData(storageRes);
        setRecentOperations(opsRes);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [currentScan]);

  const handleUndo = async (operationId) => {
    setUndoingId(operationId);
    try {
      const res = await operationService.undoOperation(operationId);
      setToastMessage({ type: 'success', text: res.message || 'Operation undone successfully' });
      // Refresh operations
      const updatedOps = await operationService.getOperations(null, 10);
      setRecentOperations(updatedOps);
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to undo operation' });
    } finally {
      setUndoingId(null);
    }
  };

  if (!currentScan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overview of local storage, duplicate detection, and recent activity.</p>
        </div>

        <EmptyState
          title="No Folder Scanned Yet"
          description="Select any local folder on your computer (or run the Demo Sandbox) to analyze files and discover organization opportunities."
          actionText="Scan a Folder"
          onAction={onOpenScanModal}
          secondaryActionText="Try Demo Sandbox"
          onSecondaryAction={onQuickSandbox}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast banner */}
      {toastMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="font-semibold text-xs ml-3 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span className="font-mono truncate max-w-md">
              Folder: <strong className="text-slate-800 font-medium">{currentScan.folder_path}</strong>
            </span>
            <span>•</span>
            <span>
              Scanned: <strong className="text-slate-700 font-mono">{formatDate(storageData?.scan_date || currentScan?.completed_at || currentScan?.started_at)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('organize')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <FolderTree className="w-3.5 h-3.5 text-slate-300" />
            <span>Organize Folder</span>
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>View Duplicates</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Files"
          value={currentScan.total_files.toLocaleString()}
          subtext="Scanned in active directory"
          icon={Files}
        />

        <StatCard
          title="Total Storage"
          value={formatBytes(currentScan.total_size)}
          subtext="Total disk space occupied"
          icon={HardDrive}
        />

        <StatCard
          title="Duplicate Files"
          value={currentScan.duplicate_files_count.toLocaleString()}
          subtext={`${currentScan.duplicate_files_count > 0 ? 'Exact redundant copies found' : 'No duplicates detected'}`}
          icon={Copy}
          badgeText={currentScan.duplicate_files_count > 0 ? 'Action Needed' : 'Clean'}
          badgeType={currentScan.duplicate_files_count > 0 ? 'warning' : 'success'}
        />

        <StatCard
          title="Recoverable Space"
          value={formatBytes(storageData?.recoverable_bytes || currentScan.duplicate_size)}
          subtext="Potential space to reclaim"
          icon={HardDrive}
          badgeText="Reclaimable"
          badgeType="success"
        />
      </div>

      {/* Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Storage by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-sans">Storage by Category</h2>
              <p className="text-[11px] text-slate-500">Breakdown of disk usage across file types</p>
            </div>
            <button
              onClick={() => setActiveTab('analytics')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="py-2">
            <StoragePieChart data={storageData?.categories || []} />
          </div>

          {/* Quick Category Legend List */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100">
            {(storageData?.categories || []).slice(0, 6).map((cat) => (
              <div key={cat.category} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-600 truncate">{cat.category}</span>
                <span className="text-slate-400 font-mono text-[11px] ml-auto">{formatBytes(cat.total_bytes)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File Count by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-sans">File Count Distribution</h2>
              <p className="text-[11px] text-slate-500">Number of files per recognized category</p>
            </div>
            <button
              onClick={() => setActiveTab('files')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Browse Files <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="py-2">
            <FileCountBarChart data={storageData?.categories || []} />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-sans">
            <span>Total Categories: <strong className="text-slate-700">{(storageData?.categories || []).length}</strong></span>
            <span>Scanned: <strong className="text-slate-700 font-mono">{formatDate(storageData?.scan_date || currentScan?.completed_at || currentScan?.started_at)}</strong></span>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Recent Operations & Audit Log</h2>
            <p className="text-[11px] text-slate-500">Actual file operations executed on your local filesystem with Undo capability</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            View Full History <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <RecentActivityList
          operations={recentOperations}
          onUndo={handleUndo}
          undoingId={undoingId}
        />
      </div>
    </div>
  );
}
