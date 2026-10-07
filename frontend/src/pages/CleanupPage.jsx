import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Copy,
  FileText,
  FolderMinus,
  RefreshCw,
  Folder
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { cleanupService } from '../services/cleanupService';
import { formatBytes, truncatePath } from '../utils/formatters';
import CategoryBadge from '../components/common/CategoryBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';

export default function CleanupPage({ setActiveTab, onOpenScanModal }) {
  const { currentScan, refreshScans } = useScan();
  const [cleanupData, setCleanupData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [useTrash, setUseTrash] = useState(true);

  useEffect(() => {
    if (!currentScan) return;
    loadCleanupPreview();
  }, [currentScan]);

  const loadCleanupPreview = async () => {
    if (!currentScan) return;
    setLoading(true);
    try {
      const data = await cleanupService.getCleanupPreview(currentScan.id);
      setCleanupData(data);

      // Pre-select duplicates and temp files by default
      const initialFiles = new Set();
      if (data.duplicates?.items) {
        data.duplicates.items.forEach((f) => initialFiles.add(f.id));
      }
      if (data.temp_files?.items) {
        data.temp_files.items.forEach((f) => initialFiles.add(f.id));
      }
      setSelectedFileIds(initialFiles);

      // Pre-select empty folders
      const initialFolders = new Set(data.empty_folders || []);
      setSelectedFolders(initialFolders);
    } catch (err) {
      console.error('Failed to load cleanup preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (id) => {
    const next = new Set(selectedFileIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFileIds(next);
  };

  const toggleFolder = (folderPath) => {
    const next = new Set(selectedFolders);
    if (next.has(folderPath)) next.delete(folderPath);
    else next.add(folderPath);
    setSelectedFolders(next);
  };

  const toggleAllCategory = (items) => {
    if (!items || items.length === 0) return;
    const allSelected = items.every((f) => selectedFileIds.has(f.id));
    const next = new Set(selectedFileIds);
    items.forEach((f) => {
      if (allSelected) next.delete(f.id);
      else next.add(f.id);
    });
    setSelectedFileIds(next);
  };

  // Calculate selected savings
  let calculatedSelectedBytes = 0;
  if (cleanupData) {
    const allItems = [
      ...(cleanupData.duplicates?.items || []),
      ...(cleanupData.large_files?.items || []),
      ...(cleanupData.temp_files?.items || []),
    ];
    allItems.forEach((f) => {
      if (selectedFileIds.has(f.id)) {
        calculatedSelectedBytes += f.size;
      }
    });
  }

  const handleExecuteCleanup = async () => {
    if (selectedFileIds.size === 0 && selectedFolders.size === 0) return;
    setExecuting(true);
    try {
      const res = await cleanupService.executeCleanup({
        scan_id: currentScan.id,
        selected_file_ids: Array.from(selectedFileIds),
        selected_empty_folders: Array.from(selectedFolders),
        use_trash: useTrash,
      });

      setToastMessage({
        type: 'success',
        text: `Cleanup successful! Freed ${formatBytes(res.freed_bytes)} across ${res.deleted_files_count} files and ${res.deleted_folders_count} empty folders.`,
      });

      setIsConfirmOpen(false);
      await loadCleanupPreview();
      await refreshScans();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Cleanup operation failed',
      });
    } finally {
      setExecuting(false);
    }
  };

  if (!currentScan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Safe Cleanup</h1>
        <EmptyState
          title="No Folder Scanned"
          description="Scan a local folder to analyze cleanup opportunities."
          actionText="Scan a Folder"
          onAction={onOpenScanModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs text-slate-600 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Safe Cleanup</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Safely purge redundant duplicate copies, temporary logs, and empty residual folders.
          </p>
        </div>

        {(selectedFileIds.size > 0 || selectedFolders.size > 0) && (
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              Clean Selected ({selectedFileIds.size} files, {selectedFolders.size} folders) • {formatBytes(calculatedSelectedBytes)}
            </span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
            <span className="text-xs">Analyzing files and empty directories for cleanup...</span>
          </div>
        </div>
      ) : !cleanupData ? (
        <EmptyState title="No Cleanup Data" description="Unable to fetch cleanup recommendations." />
      ) : (
        <div className="space-y-6">
          {/* 1. Duplicate Files Section */}
          {cleanupData.duplicates && cleanupData.duplicates.count > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-600" />
                    <span>Duplicate Copies ({cleanupData.duplicates.count})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{cleanupData.duplicates.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-amber-700">
                    {formatBytes(cleanupData.duplicates.total_size)}
                  </span>
                  <button
                    onClick={() => toggleAllCategory(cleanupData.duplicates.items)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Toggle All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {cleanupData.duplicates.items.map((file) => {
                  const isChecked = selectedFileIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFile(file.id)}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-red-600 border-slate-300"
                        />
                        <div className="truncate font-medium text-slate-800">{file.name}</div>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                          {truncatePath(file.path, 30)}
                        </span>
                      </div>
                      <span className="font-mono text-slate-600 pl-2">{formatBytes(file.size)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Temporary & Log Files */}
          {cleanupData.temp_files && cleanupData.temp_files.count > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Temporary & Log Files ({cleanupData.temp_files.count})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{cleanupData.temp_files.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {formatBytes(cleanupData.temp_files.total_size)}
                  </span>
                  <button
                    onClick={() => toggleAllCategory(cleanupData.temp_files.items)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Toggle All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {cleanupData.temp_files.items.map((file) => {
                  const isChecked = selectedFileIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFile(file.id)}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-red-600 border-slate-300"
                        />
                        <div className="truncate font-medium text-slate-800">{file.name}</div>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                          {truncatePath(file.path, 30)}
                        </span>
                      </div>
                      <span className="font-mono text-slate-600 pl-2">{formatBytes(file.size)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Empty Folders Section */}
          {cleanupData.empty_folders && cleanupData.empty_folders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
                    <FolderMinus className="w-4 h-4 text-slate-600" />
                    <span>Empty Subdirectories ({cleanupData.empty_folders.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Directories containing 0 files that can be cleaned up
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {cleanupData.empty_folders.map((folderPath) => {
                  const isChecked = selectedFolders.has(folderPath);
                  return (
                    <div
                      key={folderPath}
                      onClick={() => toggleFolder(folderPath)}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-red-600 border-slate-300"
                        />
                        <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="font-mono text-slate-700 truncate">{folderPath}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
                        Empty
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteCleanup}
        title="Confirm Safe Cleanup"
        description={`You are about to clean ${selectedFileIds.size} files and ${selectedFolders.size} empty folders.`}
        confirmText={useTrash ? 'Move to Trash' : 'Permanently Delete'}
        isDanger={true}
        loading={executing}
        details={
          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-medium">
              <span>Total space freed:</span>
              <span className="font-mono text-emerald-700 font-bold">{formatBytes(calculatedSelectedBytes)}</span>
            </div>
            <label className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useTrash}
                onChange={(e) => setUseTrash(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300"
              />
              <span>Send to OS Trash (recommended for safe recovery)</span>
            </label>
          </div>
        }
      />
    </div>
  );
}
