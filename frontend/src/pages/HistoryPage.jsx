import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  FolderTree,
  Trash2,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { operationService } from '../services/operationService';
import { useScan } from '../context/ScanContext';
import { formatDate, formatRelativeTime, formatBytes, truncatePath } from '../utils/formatters';
import EmptyState from '../components/common/EmptyState';

export default function HistoryPage() {
  const { refreshScans } = useScan();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState(null);
  const [undoingBatch, setUndoingBatch] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await operationService.getOperations(null, 150);
      setOperations(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoSingle = async (opId) => {
    setUndoingId(opId);
    setToastMessage(null);
    try {
      const res = await operationService.undoOperation(opId);
      setToastMessage({
        type: 'success',
        text: res.message || 'File restored back to original location successfully.',
      });
      await loadHistory();
      await refreshScans();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to undo operation',
      });
    } finally {
      setUndoingId(null);
    }
  };

  const handleUndoBatch = async (batchId) => {
    if (!batchId) return;
    setUndoingBatch(batchId);
    setToastMessage(null);
    try {
      const res = await operationService.undoBatch(batchId);
      setToastMessage({
        type: 'success',
        text: `Batch undo complete: ${res.restored_count} files moved back to original locations.`,
      });
      await loadHistory();
      await refreshScans();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to undo batch',
      });
    } finally {
      setUndoingBatch(null);
    }
  };

  // Filter operations
  const filteredOperations = operations.filter((op) => {
    if (filterType !== 'ALL' && op.operation_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        op.file_name.toLowerCase().includes(q) ||
        op.source_path.toLowerCase().includes(q) ||
        (op.destination_path && op.destination_path.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Unique batches for batch undo list
  const batches = Array.from(
    new Set(operations.filter((op) => op.batch_id && op.can_undo).map((op) => op.batch_id))
  );

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
          <div className="flex items-center gap-2">
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Operation History & Undo</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of all file organization moves and cleanups. Undo supported operations with a single click.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Batch Undo Banner if reversible batches exist */}
      {batches.length > 0 && (
        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold font-sans flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reversible Organization Batches Available</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              You can reverse entire organization operations with 1-click.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {batches.map((bId) => (
              <button
                key={bId}
                onClick={() => handleUndoBatch(bId)}
                disabled={undoingBatch === bId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-amber-300 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3 h-3 ${undoingBatch === bId ? 'animate-spin' : ''}`} />
                <span>Undo Batch ({bId.substring(0, 14)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name or path..."
            className="w-full text-xs pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 w-full sm:w-auto"
          >
            <option value="ALL">All Actions</option>
            <option value="ORGANIZE_MOVE">Organize Moves</option>
            <option value="DELETE_DUPLICATE">Duplicate Cleanups</option>
            <option value="CLEANUP_DELETE">Cleanups</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
              <span className="text-xs">Loading audit log...</span>
            </div>
          </div>
        ) : filteredOperations.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No operations found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Original Location</th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4">New Location</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Undo Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredOperations.map((op) => {
                  const isUndone = op.status === 'UNDONE';
                  const isOrganize = op.operation_type === 'ORGANIZE_MOVE';

                  return (
                    <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Action Pill */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isOrganize
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isOrganize ? 'Organized' : 'Deleted'}
                        </span>
                      </td>

                      {/* File Name */}
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-[180px] truncate" title={op.file_name}>
                        {op.file_name}
                      </td>

                      {/* Source Path */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[180px] truncate" title={op.source_path}>
                        {truncatePath(op.source_path, 25)}
                      </td>

                      <td className="py-3 px-1 text-slate-300 text-center">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </td>

                      {/* Destination Path */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-800 font-medium max-w-[200px] truncate" title={op.destination_path}>
                        {op.destination_path ? truncatePath(op.destination_path, 25) : '—'}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatRelativeTime(op.timestamp)}
                      </td>

                      {/* Undo Button */}
                      <td className="py-3 px-4 text-right">
                        {isUndone ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            Undone
                          </span>
                        ) : op.can_undo ? (
                          <button
                            onClick={() => handleUndoSingle(op.id)}
                            disabled={undoingId === op.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${undoingId === op.id ? 'animate-spin' : ''}`} />
                            <span>Undo</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
