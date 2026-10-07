import React from 'react';
import { ArrowRight, RotateCcw, CheckCircle2, AlertCircle, FileText, Trash2, FolderTree } from 'lucide-react';
import { formatRelativeTime, formatBytes, truncatePath } from '../../utils/formatters';

export default function RecentActivityList({ operations = [], onUndo, undoingId = null }) {
  if (!operations || operations.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No recent operations recorded yet.
      </div>
    );
  }

  const getActionBadge = (type) => {
    switch (type) {
      case 'ORGANIZE_MOVE':
        return {
          label: 'Moved',
          icon: FolderTree,
          bg: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'DELETE_DUPLICATE':
        return {
          label: 'Duplicate Removed',
          icon: Trash2,
          bg: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'CLEANUP_DELETE':
        return {
          label: 'Cleaned',
          icon: Trash2,
          bg: 'bg-red-50 text-red-700 border-red-200'
        };
      case 'UNDO_RESTORE':
        return {
          label: 'Restored',
          icon: RotateCcw,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      default:
        return {
          label: type,
          icon: FileText,
          bg: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  return (
    <div className="divide-y divide-slate-100">
      {operations.slice(0, 8).map((op) => {
        const badge = getActionBadge(op.operation_type);
        const Icon = badge.icon;
        const isUndone = op.status === 'UNDONE';

        return (
          <div key={op.id} className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-1.5 rounded-lg border flex-shrink-0 ${badge.bg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 truncate font-sans">
                    {op.file_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatBytes(op.file_size)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono truncate mt-0.5">
                  <span className="truncate" title={op.source_path}>
                    {truncatePath(op.source_path, 28)}
                  </span>
                  {op.destination_path && (
                    <>
                      <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate text-slate-700" title={op.destination_path}>
                        {truncatePath(op.destination_path, 28)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-3 flex-shrink-0">
              <span className="text-[11px] text-slate-400">
                {formatRelativeTime(op.timestamp)}
              </span>

              {isUndone ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  Undone
                </span>
              ) : op.can_undo && onUndo ? (
                <button
                  onClick={() => onUndo(op.id)}
                  disabled={undoingId === op.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
                  title="Move back to original location"
                >
                  <RotateCcw className={`w-3 h-3 ${undoingId === op.id ? 'animate-spin' : ''}`} />
                  <span>Undo</span>
                </button>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium text-slate-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-1" />
                  Done
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
