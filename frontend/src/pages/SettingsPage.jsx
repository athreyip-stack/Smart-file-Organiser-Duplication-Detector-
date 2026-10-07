import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Layers,
  HardDrive,
  Database,
  CheckCircle2,
  Save,
  Trash2,
  FolderMinus
} from 'lucide-react';
import { systemService } from '../services/systemService';
import CategoryBadge from '../components/common/CategoryBadge';

export default function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'light',
    safe_delete_method: 'trash',
    auto_check_duplicates: true,
    default_excluded_dirs: ['.git', 'node_modules', '.DS_Store', '__pycache__', 'venv', '.venv'],
    default_organization_strategy: 'CATEGORY',
    version: '1.0.0',
    data_dir: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [sets, cats] = await Promise.all([
        systemService.getSettings(),
        systemService.getCategories(),
      ]);
      setSettings((prev) => ({ ...prev, ...sets }));
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await systemService.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Settings & Preferences</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure cleanup safety thresholds, default exclusions, and file categorization rules.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Safety & Deletion Preferences */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Deletion Safety Strategy</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="safe_delete_method"
                value="trash"
                checked={settings.safe_delete_method === 'trash'}
                onChange={(e) => setSettings({ ...settings, safe_delete_method: e.target.value })}
                className="mt-0.5 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900">Native OS Trash / Recycle Bin (Recommended)</div>
                <div className="text-[11px] text-slate-500">
                  Files are moved directly to your system's native trash folder so you can recover them at any time.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="safe_delete_method"
                value="quarantine"
                checked={settings.safe_delete_method === 'quarantine'}
                onChange={(e) => setSettings({ ...settings, safe_delete_method: e.target.value })}
                className="mt-0.5 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900">Sortiva Quarantine Directory</div>
                <div className="text-[11px] text-slate-500">
                  Files are moved to an isolated internal `.sortiva_trash` directory with 1-click database undo.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Excluded Folders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FolderMinus className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Ignored Folders & Exclusions</h2>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-500">
              The scanner will automatically skip indexing or modifying directories matching these names:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(settings.default_excluded_dirs || []).map((dir) => (
                <span
                  key={dir}
                  className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700 text-xs"
                >
                  {dir}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Category Definitions Reference */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Category Extension Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <CategoryBadge category={cat.name} size="sm" />
                  <span className="text-[10px] text-slate-400 font-mono">{cat.extensions.length} extensions</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{cat.description}</div>
                <div className="font-mono text-[10px] text-slate-600 truncate bg-white p-1 rounded border border-slate-200">
                  {cat.extensions.join(', ') || 'Auto-fallback'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System & Database Info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900 font-sans">Database & Environment</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-0.5">Database Engine</span>
              <span className="text-slate-800 font-semibold">SQLite (Local)</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Application Version</span>
              <span className="text-slate-800 font-semibold">Sortiva v{settings.version}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{loading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
