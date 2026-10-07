import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Copy,
  Folder,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Layers,
  Eye,
  Info
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { fileService } from '../services/fileService';
import { formatBytes, formatDate, truncatePath } from '../utils/formatters';
import CategoryBadge from '../components/common/CategoryBadge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';

const CATEGORIES = [
  'All',
  'PDFs',
  'Documents',
  'Spreadsheets',
  'Presentations',
  'Images',
  'Videos',
  'Audio',
  'Archives',
  'Code',
  'Others',
];

export default function FilesPage({ setActiveTab, onOpenScanModal }) {
  const { currentScan } = useScan();
  const [files, setFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedExtension, setSelectedExtension] = useState('');
  const [duplicateFilter, setDuplicateFilter] = useState('all'); // 'all', 'duplicates', 'originals'
  const [sortBy, setSortBy] = useState('modified_at');
  const [sortDesc, setSortDesc] = useState(true);

  // Detail Modal
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!currentScan) return;
    loadFiles();
  }, [
    currentScan,
    page,
    pageSize,
    selectedCategory,
    selectedExtension,
    duplicateFilter,
    sortBy,
    sortDesc,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentScan) {
        setPage(1);
        loadFiles();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadFiles = async () => {
    if (!currentScan) return;
    setLoading(true);
    try {
      let isDupParam = null;
      if (duplicateFilter === 'duplicates') isDupParam = true;
      if (duplicateFilter === 'unique') isDupParam = false;

      const data = await fileService.getFiles({
        scan_id: currentScan.id,
        query: searchQuery,
        category: selectedCategory,
        extension: selectedExtension,
        is_duplicate: isDupParam,
        sort_by: sortBy,
        sort_desc: sortDesc,
        page,
        page_size: pageSize,
      });

      setFiles(data.items || []);
      setTotalFiles(data.total || 0);
      setTotalPages(data.total_pages || 0);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  if (!currentScan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">File Explorer</h1>
        <EmptyState
          title="No Scanned Files Available"
          description="Scan a folder on your computer first to browse, search, and filter real files."
          actionText="Scan a Folder"
          onAction={onOpenScanModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">File Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing <strong className="text-slate-800 font-mono">{totalFiles.toLocaleString()}</strong> actual files in{' '}
            <span className="font-mono text-slate-700 font-medium">{truncatePath(currentScan.folder_path, 40)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('organize')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <FolderTree className="w-3.5 h-3.5 text-slate-300" />
            <span>Organize Scanned Files</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name, path, or extension (.pdf, invoice, data)..."
              className="w-full text-xs pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* Duplicate filter dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={duplicateFilter}
              onChange={(e) => {
                setDuplicateFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="all">All Files</option>
              <option value="duplicates">Duplicates Only</option>
              <option value="unique">Unique Files</option>
            </select>

            {/* Page size dropdown */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>File Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('size')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Size</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('modified_at')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Modified Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span>Loading scanned files...</span>
                    </div>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No files found matching your criteria.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* File Name & Ext */}
                    <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[240px]">
                      <div className="flex items-center gap-2 truncate" title={f.name}>
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-blue-500" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    </td>

                    {/* Category Pill */}
                    <td className="py-2.5 px-4">
                      <CategoryBadge category={f.category} size="sm" />
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {formatBytes(f.size)}
                    </td>

                    {/* Modified Date */}
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(f.modified_at)}
                    </td>

                    {/* Location Path */}
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] max-w-[200px] truncate" title={f.path}>
                      {truncatePath(f.directory, 30)}
                    </td>

                    {/* Duplicate Status Badge */}
                    <td className="py-2.5 px-4 text-center">
                      {f.is_duplicate ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            f.is_original
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                          title={`Duplicate Group: ${f.duplicate_group_id}`}
                        >
                          <Copy className="w-3 h-3" />
                          {f.is_original ? 'Original' : 'Duplicate'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Unique
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedFile(f)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        title="View file metadata"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 font-mono">{files.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="text-slate-800 font-mono">{Math.min(page * pageSize, totalFiles)}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{totalFiles}</strong> files
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* File Metadata Detail Modal */}
      {selectedFile && (
        <Modal
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          title="File Details & Metadata"
          subtitle={selectedFile.name}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs font-sans">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">File Name</span>
                <span className="font-medium text-slate-900 font-mono select-all">{selectedFile.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Category</span>
                <CategoryBadge category={selectedFile.category} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">File Size</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatBytes(selectedFile.size)} ({selectedFile.size.toLocaleString()} bytes)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Extension</span>
                <span className="font-mono font-semibold text-slate-800">{selectedFile.extension}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">MIME Type</span>
                <span className="font-mono text-slate-700">{selectedFile.mime_type || 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Last Modified</span>
                <span className="text-slate-700">{formatDate(selectedFile.modified_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Created Date</span>
                <span className="text-slate-700">{formatDate(selectedFile.created_at)}</span>
              </div>
              {selectedFile.sha256_hash && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-0.5">SHA-256 Hash</span>
                  <span className="font-mono text-[10px] text-slate-800 bg-white p-1.5 border border-slate-200 rounded block break-all select-all">
                    {selectedFile.sha256_hash}
                  </span>
                </div>
              )}
            </div>

            {/* Absolute Path display */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Full Local Path</label>
              <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg break-all select-all">
                {selectedFile.path}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
