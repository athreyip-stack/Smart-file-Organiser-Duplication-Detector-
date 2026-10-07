import React from 'react';
import {
  LayoutDashboard,
  FolderSearch,
  Files,
  Copy,
  FolderTree,
  PieChart,
  Trash2,
  History,
  Settings,
  HardDrive
} from 'lucide-react';
import { useScan } from '../../context/ScanContext';
import { formatBytes } from '../../utils/formatters';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scan', label: 'Scan Folder', icon: FolderSearch },
  { id: 'files', label: 'File Explorer', icon: Files },
  { id: 'duplicates', label: 'Duplicates', icon: Copy, badgeKey: 'duplicate_files_count' },
  { id: 'organize', label: 'Organize', icon: FolderTree },
  { id: 'analytics', label: 'Storage Analytics', icon: PieChart },
  { id: 'cleanup', label: 'Safe Cleanup', icon: Trash2 },
  { id: 'history', label: 'History & Undo', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentScan } = useScan();

  return (
    <aside className="w-56 bg-slate-50/60 border-r border-slate-200 p-3 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = item.badgeKey && currentScan ? currentScan[item.badgeKey] : 0;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {badgeCount > 0 && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-slate-700 text-amber-300'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Scan Footer Widget */}
      {currentScan && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Active Folder</span>
          </div>
          <div className="font-mono text-[11px] font-medium text-slate-800 truncate" title={currentScan.folder_path}>
            {currentScan.folder_path.split('/').pop() || currentScan.folder_path}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>{currentScan.total_files} files</span>
            <span className="font-semibold text-slate-700">{formatBytes(currentScan.total_size)}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
