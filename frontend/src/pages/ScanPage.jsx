import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderSearch,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  FolderPlus,
  Layers,
  ChevronRight,
  FolderOpen,
  Trash2,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { systemService } from '../services/systemService';
import { scanService } from '../services/scanService';
import { formatBytes, formatDate, truncatePath } from '../utils/formatters';
import FolderBrowserModal from '../components/common/FolderBrowserModal';

export default function ScanPage({ setActiveTab, onQuickSandbox }) {
  const { currentScan, scansList, isScanning, scanProgress, startScan, selectScan, refreshScans } = useScan();
  const [folderPath, setFolderPath] = useState('');
  const [commonFolders, setCommonFolders] = useState([]);
  const [pathValidation, setPathValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [recursive, setRecursive] = useState(true);
  const [maxDepth, setMaxDepth] = useState(-1);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    async function loadCommon() {
      try {
        const data = await systemService.getCommonFolders();
        setCommonFolders(data.folders || []);
        // Default to first existing folder if empty
        if (!folderPath && data.folders?.length > 0) {
          setFolderPath(data.folders[0].path);
          validatePath(data.folders[0].path);
        }
      } catch (err) {
        console.error('Failed to load common folders:', err);
      }
    }
    loadCommon();
  }, []);

  const validatePath = async (path) => {
    if (!path || !path.trim()) {
      setPathValidation(null);
      return;
    }
    setIsValidating(true);
    try {
      const res = await systemService.checkPath(path);
      setPathValidation(res);
    } catch (err) {
      setPathValidation({
        exists: false,
        is_dir: false,
        readable: false,
        message: err.message || 'Invalid path',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handlePathChange = (e) => {
    const val = e.target.value;
    setFolderPath(val);
    validatePath(val);
  };

  const handleQuickSelect = (path) => {
    setFolderPath(path);
    validatePath(path);
  };

  const handleStartScan = async () => {
    if (!folderPath) return;
    setScanError(null);
    try {
      await startScan(folderPath, {
        recursive,
        max_depth: maxDepth === -1 ? -1 : parseInt(maxDepth, 10),
      });
      // Navigate to dashboard or files upon success
      setActiveTab('dashboard');
    } catch (err) {
      setScanError(err.message || 'Scan failed');
    }
  };

  const handleDeleteScan = async (e, scanId) => {
    e.stopPropagation();
    try {
      await scanService.deleteScan(scanId);
      await refreshScans();
    } catch (err) {
      console.error('Error deleting scan index:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Scan Local Folder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select an actual directory on your computer to analyze metadata, detect duplicate files, and categorize storage.
          </p>
        </div>

        <button
          onClick={onQuickSandbox}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
        >
          <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          <span>Create Demo Sandbox</span>
        </button>
      </div>

      {/* Main Scanner Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Step 1: Quick Common Folders */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Folder Shortcuts
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {commonFolders.map((f) => {
              const isSelected = folderPath === f.path;
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => handleQuickSelect(f.path)}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <Folder className={`w-4 h-4 mb-2 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-semibold truncate">{f.name}</div>
                    <div className={`text-[10px] truncate font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {f.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Custom Directory Input & Browser */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Target Folder Path
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={folderPath}
                onChange={handlePathChange}
                placeholder="/Users/username/Downloads or C:\Users\Documents"
                className="w-full font-mono text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
              {isValidating ? (
                <div className="absolute right-3 top-3">
                  <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              ) : pathValidation?.readable ? (
                <div className="absolute right-3 top-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              ) : pathValidation && !pathValidation.readable ? (
                <div className="absolute right-3 top-3">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsBrowserOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex-shrink-0"
            >
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <span>Browse...</span>
            </button>
          </div>

          {/* Validation Feedback */}
          {pathValidation && (
            <div
              className={`text-xs flex items-center gap-1.5 mt-1 ${
                pathValidation.readable ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {pathValidation.readable ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Valid directory ready for scan (~{pathValidation.file_count_estimate}+ files)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pathValidation.message}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Scan Options */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={recursive}
                onChange={(e) => setRecursive(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-800 border-slate-300"
              />
              <span>Include Subdirectories (Recursive)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Max Depth:</span>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
              >
                <option value={-1}>Unlimited (Deep)</option>
                <option value={1}>1 Level</option>
                <option value={2}>2 Levels</option>
                <option value={3}>3 Levels</option>
                <option value={5}>5 Levels</option>
              </select>
            </div>
          </div>

          {/* Start Scan Button */}
          <button
            type="button"
            onClick={handleStartScan}
            disabled={isScanning || (pathValidation && !pathValidation.readable)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning Files...</span>
              </>
            ) : (
              <>
                <FolderSearch className="w-4 h-4" />
                <span>Start Full Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Scan Error Message */}
        {scanError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {scanError}
          </div>
        )}

        {/* Live Progress Bar during active scan */}
        {isScanning && scanProgress && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                {scanProgress.status === 'SCANNING_FILES'
                  ? 'Crawling files & extracting metadata...'
                  : scanProgress.status === 'ANALYZING_DUPLICATES'
                  ? 'Running staged SHA-256 duplicate analysis...'
                  : 'Indexing results in SQLite...'}
              </span>
              <span className="font-mono text-slate-600 font-medium">
                {scanProgress.files_scanned} files scanned ({formatBytes(scanProgress.total_bytes_scanned)})
              </span>
            </div>

            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-900 h-full w-2/3 rounded-full animate-pulse" />
            </div>

            <div className="font-mono text-[11px] text-slate-500 truncate">
              {scanProgress.current_folder}
            </div>
          </div>
        )}
      </div>

      {/* Previous Scans History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Recent Scans</h2>
            <p className="text-[11px] text-slate-500">Easily switch between previously indexed folders</p>
          </div>
        </div>

        {scansList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No scans recorded yet. Select a folder above to start.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {scansList.map((s) => {
              const isSelected = currentScan?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => selectScan(s.id)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-50/90' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border flex-shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <HardDrive className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate font-mono">
                          {truncatePath(s.folder_path, 40)}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>{s.total_files} files</span>
                        <span>•</span>
                        <span>{formatBytes(s.total_size)}</span>
                        <span>•</span>
                        <span className="text-amber-600 font-medium">
                          {s.duplicate_files_count} duplicates ({formatBytes(s.duplicate_size)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-3 flex-shrink-0">
                    <span className="text-xs text-slate-400 font-sans">
                      {formatDate(s.started_at)}
                    </span>

                    <button
                      onClick={(e) => handleDeleteScan(e, s.id)}
                      title="Delete scan index"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Folder Browser Modal */}
      <FolderBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        initialPath={folderPath}
        onSelectFolder={(selected) => {
          setFolderPath(selected);
          validatePath(selected);
        }}
      />
    </div>
  );
}
