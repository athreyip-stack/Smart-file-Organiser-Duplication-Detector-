import { api } from './api';

export const storageService = {
  async getStorageSummary(scan_id = null) {
    const url = scan_id ? `/storage/summary?scan_id=${scan_id}` : '/storage/summary';
    return await api.get(url);
  }
};
