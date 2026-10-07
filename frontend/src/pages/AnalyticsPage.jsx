import React, { useState, useEffect } from 'react';
import {
  PieChart,
  BarChart3,
  HardDrive,
  Files,
  Copy,
  FileText,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Download
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { storageService } from '../services/storageService';
import { formatBytes, formatDate, truncatePath } from '../utils/formatters';
import CategoryBadge from '../components/common/CategoryBadge';
import EmptyState from '../components/common/EmptyState';
import StoragePieChart from '../components/dashboard/StoragePieChart';
import FileCountBarChart from '../components/dashboard/FileCountBarChart';

export default function AnalyticsPage({ setActiveTab, onOpenScanModal }) {
  const { currentScan } = useScan();
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentScan) return;
    loadAnalytics();
  }, [currentScan]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await storageService.getStorageSummary(currentScan.id);
      setStorageData(data);
    } catch (err) {
      console.error('Failed to load storage analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentScan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Storage Analytics</h1>
        <EmptyState
          title="No Storage Analytics Available"
          description="Scan a local folder to visualize storage breakdown, largest files, and duplicate space."
          actionText="Scan a Folder"
          onAction={onOpenScanModal}
        />
      </div>
    );
  }

  const dupRatio = currentScan.total_size > 0
    ? Math.round(((storageData?.recoverable_bytes || currentScan.duplicate_size) / currentScan.total_size) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Storage Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real disk usage breakdown, file category distribution, and top space consumers.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Scanned: <strong className="text-slate-800">{formatDate(storageData?.scan_date || currentScan?.completed_at || currentScan?.started_at)}</strong>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Scanned Size</div>
          <div className="text-2xl font-bold text-slate-900 font-sans mt-2">
            {formatBytes(currentScan.total_size)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">{currentScan.total_files.toLocaleString()} files</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Duplicate Wastage</div>
          <div className="text-2xl font-bold text-amber-600 font-sans mt-2">
            {formatBytes(storageData?.recoverable_bytes || currentScan.duplicate_size)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {currentScan.duplicate_files_count} redundant duplicate copies
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Wastage Ratio</div>
          <div className="text-2xl font-bold text-slate-900 font-sans mt-2">
            {dupRatio}%
          </div>
          <div className="text-xs text-slate-500 mt-1">of total directory space</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recognized Types</div>
          <div className="text-2xl font-bold text-slate-900 font-sans mt-2">
            {storageData?.top_extensions?.length || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Unique file formats</div>
        </div>
      </div>

      {/* Storage Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Pie */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Storage by Category</h2>
            <p className="text-[11px] text-slate-500">Bytes allocated per category</p>
          </div>

          <div className="py-2">
            <StoragePieChart data={storageData?.categories || []} />
          </div>

          {/* Table List of Categories */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto">
            {(storageData?.categories || []).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-slate-800">{cat.category}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 font-mono">
                  <span>{cat.file_count} files</span>
                  <span className="font-semibold text-slate-900">{formatBytes(cat.total_bytes)}</span>
                  <span className="text-[11px] text-slate-400 w-10 text-right">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Extensions Table & Counts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Top File Formats</h2>
            <p className="text-[11px] text-slate-500">Extensions consuming the most storage space</p>
          </div>

          <div className="py-2 overflow-y-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Extension</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Count</th>
                  <th className="py-2 px-3 text-right">Total Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {(storageData?.top_extensions || []).map((ext) => (
                  <tr key={ext.extension} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      {ext.extension}
                    </td>
                    <td className="py-2 px-3">
                      <CategoryBadge category={ext.category} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 font-mono">
                      {ext.file_count}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatBytes(ext.total_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Extensions tracked</span>
            <button
              onClick={() => setActiveTab('files')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Filter in Explorer →
            </button>
          </div>
        </div>
      </div>

      {/* Largest 10 Files Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Top 10 Largest Files</h2>
            <p className="text-[11px] text-slate-500">Largest individual files occupying space on disk</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">File Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Path</th>
                <th className="py-2.5 px-4 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(storageData?.largest_files || []).map((file, idx) => (
                <tr key={file.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[220px] truncate" title={file.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                      <span className="truncate">{file.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <CategoryBadge category={file.category} size="sm" />
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] max-w-[300px] truncate" title={file.path}>
                    {truncatePath(file.path, 40)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatBytes(file.size)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
