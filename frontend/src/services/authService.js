import { api } from './api';

export const authService = {
  async register(username, email, password) {
    const data = await api.post('/auth/register', { username, email, password });
    if (data.access_token) {
      localStorage.setItem('sortiva_token', data.access_token);
      localStorage.setItem('sortiva_user', JSON.stringify(data.user));
    }
    return data;
  },

  async login(username_or_email, password) {
    const data = await api.post('/auth/login', { username_or_email, password });
    if (data.access_token) {
      localStorage.setItem('sortiva_token', data.access_token);
      localStorage.setItem('sortiva_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getMe() {
    return await api.get('/auth/me');
  },

  logout() {
    localStorage.removeItem('sortiva_token');
    localStorage.removeItem('sortiva_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('sortiva_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('sortiva_token');
  }
};
