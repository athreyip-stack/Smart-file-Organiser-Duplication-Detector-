import React, { useState, useEffect } from 'react';
import {
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
  RefreshCw,
  Folder
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { duplicateService } from '../services/duplicateService';
import { formatBytes, formatDate, truncatePath } from '../utils/formatters';
import CategoryBadge from '../components/common/CategoryBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';

export default function DuplicatesPage({ setActiveTab, onOpenScanModal }) {
  const { currentScan, refreshScans } = useScan();
  const [duplicateSummary, setDuplicateSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [useTrash, setUseTrash] = useState(true);

  useEffect(() => {
    if (!currentScan) return;
    loadDuplicates();
  }, [currentScan]);

  const loadDuplicates = async () => {
    if (!currentScan) return;
    setLoading(true);
    try {
      const data = await duplicateService.getDuplicates(currentScan.id);
      setDuplicateSummary(data);

      // Auto select duplicate copies (leaving suggested original unchecked)
      const initialSelected = new Set();
      data.groups.forEach((g) => {
        g.files.forEach((f) => {
          if (!f.is_original) {
            initialSelected.add(f.id);
          }
        });
      });
      setSelectedFileIds(initialSelected);
    } catch (err) {
      console.error('Failed to load duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectFile = (fileId) => {
    const next = new Set(selectedFileIds);
    if (next.has(fileId)) {
      next.delete(fileId);
    } else {
      next.add(fileId);
    }
    setSelectedFileIds(next);
  };

  const selectAllCopies = () => {
    if (!duplicateSummary) return;
    const allCopies = new Set();
    duplicateSummary.groups.forEach((g) => {
      g.files.forEach((f) => {
        if (!f.is_original) allCopies.add(f.id);
      });
    });
    setSelectedFileIds(allCopies);
  };

  const deselectAll = () => {
    setSelectedFileIds(new Set());
  };

  // Calculate selected files count and total reclaimable space
  let selectedCount = selectedFileIds.size;
  let selectedBytes = 0;
  if (duplicateSummary) {
    duplicateSummary.groups.forEach((g) => {
      g.files.forEach((f) => {
        if (selectedFileIds.has(f.id)) {
          selectedBytes += f.size;
        }
      });
    });
  }

  const handleExecuteDelete = async () => {
    if (selectedFileIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await duplicateService.deleteDuplicates(Array.from(selectedFileIds), useTrash);
      setToastMessage({
        type: 'success',
        text: `Successfully cleaned ${res.deleted_files_count} duplicate files (${formatBytes(res.freed_bytes)} recovered)!`,
      });
      setIsConfirmOpen(false);
      await loadDuplicates();
      await refreshScans();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to delete duplicates',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!currentScan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Duplicate Detection</h1>
        <EmptyState
          title="No Scanned Folder"
          description="Scan a folder first to perform staged SHA-256 duplicate content detection."
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
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-semibold text-xs ml-3 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Duplicate Detection</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Staged exact SHA-256 matching. Select copies to safely remove and recover disk space.
          </p>
        </div>

        {duplicateSummary && duplicateSummary.total_groups > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllCopies}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Select All Copies
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Selected ({selectedCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Banner */}
      {duplicateSummary && duplicateSummary.total_groups > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-900">
                {duplicateSummary.total_groups} Duplicate Groups Detected
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                {duplicateSummary.total_duplicate_files} total copies sharing exact cryptographic content hashes.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="text-slate-500">Total Duplicate Storage</div>
              <div className="font-bold text-slate-800 font-mono text-sm">
                {formatBytes(duplicateSummary.total_duplicate_size)}
              </div>
            </div>
            <div className="h-8 w-px bg-amber-200" />
            <div className="text-right">
              <div className="text-emerald-700 font-medium">Recoverable Space</div>
              <div className="font-bold text-emerald-800 font-mono text-base">
                {formatBytes(duplicateSummary.total_recoverable_size)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Groups List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
            <span className="text-xs">Analyzing duplicate content groups...</span>
          </div>
        </div>
      ) : !duplicateSummary || duplicateSummary.total_groups === 0 ? (
        <EmptyState
          title="No Duplicate Files Found"
          description="Great job! All scanned files in this directory have unique content."
          icon={CheckCircle2}
          actionText="Browse All Files"
          onAction={() => setActiveTab('files')}
        />
      ) : (
        <div className="space-y-4">
          {duplicateSummary.groups.map((group, groupIndex) => (
            <div
              key={group.group_id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-800 font-sans">
                    Duplicate Group #{groupIndex + 1}
                  </span>
                  <CategoryBadge category={group.category} size="sm" />
                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={group.sha256_hash}>
                    SHA: {group.sha256_hash.substring(0, 8)}...
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <span>
                    Size each: <strong className="font-mono text-slate-800">{formatBytes(group.file_size)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Copies: <strong className="text-slate-800">{group.file_count}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">
                    Recoverable: <strong className="font-mono">{formatBytes(group.recoverable_size)}</strong>
                  </span>
                </div>
              </div>

              {/* Group Files List */}
              <div className="divide-y divide-slate-100">
                {group.files.map((file) => {
                  const isSelected = selectedFileIds.has(file.id);
                  const isOriginal = file.is_original;

                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleSelectFile(file.id)}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-red-50/40 hover:bg-red-50/60'
                          : isOriginal
                          ? 'bg-blue-50/20 hover:bg-blue-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800 truncate font-sans">
                              {file.name}
                            </span>

                            {isOriginal ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                Keep (Original)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Duplicate Copy
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5" title={file.path}>
                            {file.path}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-3 flex-shrink-0 text-xs text-slate-500">
                        <span className="hidden md:inline">{formatDate(file.modified_at)}</span>
                        <span className="font-mono font-medium text-slate-700">{formatBytes(file.size)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteDelete}
        title="Confirm Duplicate Deletion"
        description={`You are about to delete ${selectedCount} duplicate files, recovering ${formatBytes(selectedBytes)} of disk space.`}
        confirmText={useTrash ? 'Move to Trash' : 'Delete Permanently'}
        isDanger={true}
        loading={deleting}
        details={
          <div className="space-y-2">
            <div className="flex items-center justify-between font-medium text-slate-800">
              <span>Files to remove:</span>
              <span className="font-mono">{selectedCount} files</span>
            </div>
            <div className="flex items-center justify-between font-medium text-emerald-700">
              <span>Space recovered:</span>
              <span className="font-mono font-bold">{formatBytes(selectedBytes)}</span>
            </div>
            <label className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useTrash}
                onChange={(e) => setUseTrash(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300"
              />
              <span>Use Safe Trash (send to OS Recycle Bin for recovery)</span>
            </label>
          </div>
        }
      />
    </div>
  );
}
