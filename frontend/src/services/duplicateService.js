import { api } from './api';

export const duplicateService = {
  async getDuplicates(scan_id = null) {
    const url = scan_id ? `/duplicates?scan_id=${scan_id}` : '/duplicates';
    return await api.get(url);
  },

  async deleteDuplicates(file_ids, use_trash = true) {
    return await api.post('/duplicates/delete', {
      file_ids,
      use_trash,
    });
  }
};
