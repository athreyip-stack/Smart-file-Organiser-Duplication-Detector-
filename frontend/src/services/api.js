const API_BASE = '/api';

/**
 * Enhanced fetch wrapper with authentication token injection and JSON parsing
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('sortiva_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (url, options) => apiRequest(url, { method: 'GET', ...options }),
  post: (url, body, options) => apiRequest(url, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (url, body, options) => apiRequest(url, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: (url, options) => apiRequest(url, { method: 'DELETE', ...options }),
};
