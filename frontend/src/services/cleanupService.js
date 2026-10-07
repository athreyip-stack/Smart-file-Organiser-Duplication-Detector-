import { api } from './api';

export const cleanupService = {
  async getCleanupPreview(scan_id = null) {
    const url = scan_id ? `/cleanup/preview?scan_id=${scan_id}` : '/cleanup/preview';
    return await api.post(url);
  },

  async executeCleanup({ scan_id, selected_file_ids = [], selected_empty_folders = [], use_trash = true }) {
    return await api.post('/cleanup/execute', {
      scan_id,
      selected_file_ids,
      selected_empty_folders,
      use_trash,
    });
  }
};
