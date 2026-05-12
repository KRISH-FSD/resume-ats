// services/api.js — Centralized API service with security features
import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // IMPORTANT: Send cookies with requests
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token Helper: Extract from cookie
const getCsrfToken = (cookieName = 'csrf_access_token') => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

// Request Interceptor: Attach CSRF token
api.interceptors.request.use((config) => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    // Default Content-Type is application/json. For FormData, axios would otherwise run
    // transformRequest that JSON-stringifies the form (losing file blobs). Clear the
    // header so the browser sends multipart/form-data with the correct boundary.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
        }
    }
    const token = localStorage.getItem('hireiq_token');
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Handle Token Refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 error and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh the token using the refresh cookie
                const csrfRefreshToken = getCsrfToken('csrf_refresh_token');
                const refreshToken = localStorage.getItem('hireiq_refresh_token');
                const headers = csrfRefreshToken ? { 'X-CSRF-TOKEN': csrfRefreshToken } : {};
                if (refreshToken) headers.Authorization = `Bearer ${refreshToken}`;
                
                const refreshResponse = await axios.post(`${API_BASE}/api/auth/refresh`, {}, { 
                    withCredentials: true,
                    headers 
                });
                if (refreshResponse.data?.access_token) {
                    localStorage.setItem('hireiq_token', refreshResponse.data.access_token);
                    originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
                }
                
                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed — user must log in again
                // You can dispatch a logout event or redirect here
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
