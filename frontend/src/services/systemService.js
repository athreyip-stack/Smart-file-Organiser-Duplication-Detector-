import { api } from './api';

export const systemService = {
  async getCommonFolders() {
    return await api.get('/system/common-folders');
  },

  async browseDirectory(path = null) {
    return await api.post('/system/browse', { path });
  },

  async checkPath(path) {
    return await api.post('/system/check-path', { path });
  },

  async createSampleSandbox() {
    return await api.post('/system/create-sample-sandbox', {});
  },

  async getSettings() {
    return await api.get('/settings');
  },

  async updateSettings(settings) {
    return await api.post('/settings', settings);
  },

  async getCategories() {
    return await api.get('/settings/categories');
  }
};
