import React from 'react';
import { Layers, Folder, HardDrive, RefreshCw, User, LogIn, LogOut, FolderPlus } from 'lucide-react';
import { useScan } from '../../context/ScanContext';
import { useAuth } from '../../context/AuthContext';
import { truncatePath } from '../../utils/formatters';

export default function Navbar({ onOpenScanModal, onQuickSandbox }) {
  const { currentScan, scansList, selectScan, isScanning } = useScan();
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand logo & active folder */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            S
          </div>
          <span className="font-semibold text-slate-900 tracking-tight font-sans text-base">
            Sortiva
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            v1.0
          </span>
        </div>

        {/* Current Folder Selector */}
        {scansList && scansList.length > 0 && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
            <Folder className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={currentScan?.id || ''}
              onChange={(e) => selectScan(Number(e.target.value))}
              className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 max-w-[280px] truncate focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {scansList.map((s) => (
                <option key={s.id} value={s.id}>
                  {truncatePath(s.folder_path, 35)} ({s.total_files} files)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick Demo Sandbox generator */}
        <button
          onClick={onQuickSandbox}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          title="Create realistic test files with duplicates"
        >
          <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          <span>Demo Sandbox</span>
        </button>

        {/* Scan Folder Button */}
        <button
          onClick={onOpenScanModal}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {isScanning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Folder className="w-3.5 h-3.5" />
          )}
          <span>{isScanning ? 'Scanning...' : 'Scan Folder'}</span>
        </button>

        {/* User profile dropdown / login */}
        <div className="pl-2 border-l border-slate-200 flex items-center">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline">{user.username}</span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-500">
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">Local Mode</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
