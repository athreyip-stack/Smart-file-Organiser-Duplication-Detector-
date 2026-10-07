import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ArrowUp, Check } from 'lucide-react';
import Modal from './Modal';
import { systemService } from '../../services/systemService';

export default function FolderBrowserModal({ isOpen, onClose, onSelectFolder, initialPath = '' }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || null);
    }
  }, [isOpen, initialPath]);

  const loadDirectory = async (path) => {
    setLoading(true);
    setError(null);
    try {
      const data = await systemService.browseDirectory(path);
      setCurrentPath(data.current_path);
      setParentPath(data.parent_path);
      setDirectories(data.directories || []);
    } catch (err) {
      setError(err.message || 'Unable to browse directory');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCurrent = () => {
    onSelectFolder(currentPath);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Browse Local Folder"
      subtitle="Navigate directories on your machine and select target folder"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Current Path Bar & Parent Navigation */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <button
            onClick={() => parentPath && loadDirectory(parentPath)}
            disabled={!parentPath || loading}
            title="Go to parent folder"
            className="p-1.5 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <div className="flex-1 font-mono text-xs text-slate-700 truncate select-all">
            {currentPath}
          </div>
        </div>

        {/* Directory Listing */}
        <div className="border border-slate-200 rounded-lg h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
              Loading folders...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-xs text-red-600">{error}</div>
          ) : directories.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              No subdirectories found
            </div>
          ) : (
            directories.map((dir) => (
              <button
                key={dir.path}
                onClick={() => loadDirectory(dir.path)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{dir.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSelectCurrent}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            Select This Folder
          </button>
        </div>
      </div>
    </Modal>
  );
}
