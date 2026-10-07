import { api } from './api';

export const fileService = {
  async getFiles({
    scan_id,
    query = '',
    category = '',
    extension = '',
    min_size = null,
    max_size = null,
    is_duplicate = null,
    sort_by = 'modified_at',
    sort_desc = true,
    page = 1,
    page_size = 50,
  } = {}) {
    const params = new URLSearchParams();
    if (scan_id) params.append('scan_id', scan_id);
    if (query) params.append('query', query);
    if (category && category !== 'All') params.append('category', category);
    if (extension) params.append('extension', extension);
    if (min_size !== null && min_size !== undefined && min_size !== '') params.append('min_size', min_size);
    if (max_size !== null && max_size !== undefined && max_size !== '') params.append('max_size', max_size);
    if (is_duplicate !== null && is_duplicate !== undefined) params.append('is_duplicate', is_duplicate);
    if (sort_by) params.append('sort_by', sort_by);
    params.append('sort_desc', sort_desc);
    params.append('page', page);
    params.append('page_size', page_size);

    return await api.get(`/files?${params.toString()}`);
  },

  async getFileDetail(file_id) {
    return await api.get(`/files/${file_id}`);
  }
};
