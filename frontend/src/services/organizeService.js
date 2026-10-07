import { api } from './api';

export const organizeService = {
  async generatePreview(scan_id, rule, selected_file_ids = null) {
    return await api.post('/organize/preview', {
      scan_id,
      rule,
      selected_file_ids,
    });
  },

  async executeOrganization(scan_id, moves) {
    return await api.post('/organize/execute', {
      scan_id,
      moves,
    });
  }
};
