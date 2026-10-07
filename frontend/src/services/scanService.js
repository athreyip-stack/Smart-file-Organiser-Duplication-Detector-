import { api } from './api';

export const scanService = {
  async startScan(folder_path, recursive = true, max_depth = -1, excluded_dirs = null) {
    return await api.post('/scan', {
      folder_path,
      recursive,
      max_depth,
      excluded_dirs,
    });
  },

  async getProgress(scan_id) {
    return await api.get(`/scan/progress/${scan_id}`);
  },

  async getLatestScan() {
    return await api.get('/scan/latest');
  },

  async getScanHistory(limit = 20) {
    return await api.get(`/scan/history?limit=${limit}`);
  },

  async getScanById(scan_id) {
    return await api.get(`/scan/${scan_id}`);
  },

  async deleteScan(scan_id) {
    return await api.delete(`/scan/${scan_id}`);
  }
};
