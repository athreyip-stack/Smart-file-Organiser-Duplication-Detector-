import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  FileText,
  Folder,
  Calendar,
  Settings2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { organizeService } from '../services/organizeService';
import { operationService } from '../services/operationService';
import { formatBytes, truncatePath } from '../utils/formatters';
import CategoryBadge from '../components/common/CategoryBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';

const STRATEGIES = [
  {
    id: 'CATEGORY',
    name: 'By Category',
    desc: 'Sort into Documents, Images, Videos, Code, Spreadsheets, etc.',
    icon: Layers,
  },
  {
    id: 'EXTENSION',
    name: 'By Extension',
    desc: 'Group into subfolders by uppercase file format (PDF, JPG, PY, CSV)',
    icon: FileText,
  },
  {
    id: 'DATE',
    name: 'By Date (Year/Month)',
    desc: 'Organize into chronological folders like 2026/03_March',
    icon: Calendar,
  },
];

export default function OrganizePage({ setActiveTab, onOpenScanModal }) {
  const { currentScan, refreshScans } = useScan();
  const [selectedStrategy, setSelectedStrategy] = useState('CATEGORY');
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [lastBatchId, setLastBatchId] = useState(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (currentScan) {
      handleGeneratePreview(selectedStrategy);
    }
  }, [currentScan, selectedStrategy]);

  const handleGeneratePreview = async (strategy) => {
    if (!currentScan) return;
    setLoadingPreview(true);
    setToastMessage(null);
    try {
      const data = await organizeService.generatePreview(currentScan.id, {
        strategy,
        target_base_dir: currentScan.folder_path,
        create_subfolders: true,
      });
      setPreviewData(data);
    } catch (err) {
      console.error('Failed to generate organize preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteOrganization = async () => {
    if (!previewData || previewData.planned_moves.length === 0) return;
    setExecuting(true);
    try {
      const res = await organizeService.executeOrganization(
        currentScan.id,
        previewData.planned_moves
      );

      setLastBatchId(res.batch_id);
      setIsConfirmOpen(false);
      setToastMessage({
        type: 'success',
        text: `Successfully organized ${res.successful_moves} files into categorized folders!`,
        canUndo: res.can_undo,
        batchId: res.batch_id,
      });

      // Refresh scan index and preview
      await refreshScans();
      await handleGeneratePreview(selectedStrategy);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Organization execution failed',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleUndoLastBatch = async () => {
    if (!lastBatchId) return;
    setUndoing(true);
    try {
      const res = await operationService.undoBatch(lastBatchId);
      setToastMessage({
        type: 'success',
        text: `Undo successful: ${res.restored_count} files restored back to their exact original locations.`,
      });
      setLastBatchId(null);
      await refreshScans();
      await handleGeneratePreview(selectedStrategy);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to undo organization batch',
      });
    } finally {
      setUndoing(false);
    }
  };

  if (!currentScan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">File Organization</h1>
        <EmptyState
          title="No Folder Scanned"
          description="Scan a folder on your computer first to generate organization plans."
          actionText="Scan a Folder"
          onAction={onOpenScanModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Toast Notification with Undo button */}
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

          <div className="flex items-center gap-2">
            {toastMessage.canUndo && lastBatchId && (
              <button
                onClick={handleUndoLastBatch}
                disabled={undoing}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-300 text-emerald-900 font-semibold rounded-lg shadow-sm hover:bg-emerald-100 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${undoing ? 'animate-spin' : ''}`} />
                <span>{undoing ? 'Undoing...' : 'Undo This Action'}</span>
              </button>
            )}
            <button onClick={() => setToastMessage(null)} className="text-xs text-slate-600 underline ml-2">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">File Organization</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preview proposed directory structures and organize real files safely with 1-click Undo.
          </p>
        </div>

        {previewData && previewData.planned_moves.length > 0 && (
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <FolderTree className="w-3.5 h-3.5 text-slate-300" />
            <span>Apply Organization Plan ({previewData.total_files})</span>
          </button>
        )}
      </div>

      {/* Strategy Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STRATEGIES.map((strat) => {
          const Icon = strat.icon;
          const isSelected = selectedStrategy === strat.id;

          return (
            <button
              key={strat.id}
              type="button"
              onClick={() => setSelectedStrategy(strat.id)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                    Active Strategy
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-bold font-sans">{strat.name}</div>
                <div className={`text-[11px] mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {strat.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Proposed Directory Folders Preview */}
      {previewData && previewData.target_directories.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-blue-600" />
            <span>Target Subdirectories to Create ({previewData.target_directories.length})</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {previewData.target_directories.map((dir) => (
              <span
                key={dir}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-white border border-slate-200 text-slate-700 shadow-2xs"
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>{dir.split('/').pop()}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Proposed Moves Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 font-sans">
              Proposed File Moves ({previewData?.total_files || 0})
            </h2>
            <p className="text-[11px] text-slate-500">
              Review how files will be moved before confirming execution
            </p>
          </div>

          {previewData && (
            <div className="text-xs text-slate-500 font-mono">
              Total Move Size: <strong className="text-slate-800">{formatBytes(previewData.total_size)}</strong>
            </div>
          )}
        </div>

        {loadingPreview ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
              <span className="text-xs">Calculating planned file movements...</span>
            </div>
          </div>
        ) : !previewData || previewData.planned_moves.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            All files are already organized according to this strategy!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Location</th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4">Proposed Destination</th>
                  <th className="py-3 px-4 text-right">Size</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-sans">
                {previewData.planned_moves.slice(0, 100).map((move) => (
                  <tr key={move.file_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[200px] truncate" title={move.file_name}>
                      {move.file_name}
                    </td>

                    <td className="py-2.5 px-4">
                      <CategoryBadge category={move.category} size="sm" />
                    </td>

                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] max-w-[180px] truncate" title={move.current_path}>
                      {truncatePath(move.current_path, 28)}
                    </td>

                    <td className="py-2.5 px-2 text-slate-400 text-center">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </td>

                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-900 font-medium max-w-[220px] truncate" title={move.proposed_path}>
                      <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {move.target_folder_name}/
                      </span>
                      <span className="ml-1">{move.file_name}</span>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {formatBytes(move.file_size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {previewData.planned_moves.length > 100 && (
              <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100 font-mono">
                Showing first 100 of {previewData.planned_moves.length} proposed file moves.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteOrganization}
        title="Confirm File Organization"
        description={`This will move ${previewData?.total_files || 0} actual files into organized folders on your computer.`}
        confirmText="Confirm & Organize"
        loading={executing}
        details={
          <div className="space-y-1.5">
            <div>
              Strategy: <strong>{STRATEGIES.find((s) => s.id === selectedStrategy)?.name}</strong>
            </div>
            <div>
              Folders to create: <strong>{previewData?.target_directories.length || 0} folders</strong>
            </div>
            <div className="text-slate-500 text-[11px] pt-1">
              Note: This action is safely recorded and can be reversed with 1-click Undo.
            </div>
          </div>
        }
      />
    </div>
  );
}
