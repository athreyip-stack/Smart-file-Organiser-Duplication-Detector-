import { api } from './api';

export const operationService = {
  async getOperations(batch_id = null, limit = 100) {
    const params = new URLSearchParams();
    if (batch_id) params.append('batch_id', batch_id);
    params.append('limit', limit);
    return await api.get(`/operations?${params.toString()}`);
  },

  async undoOperation(operation_id) {
    return await api.post(`/operations/${operation_id}/undo`, {});
  },

  async undoBatch(batch_id) {
    return await api.post('/operations/undo-batch', { batch_id });
  }
};
