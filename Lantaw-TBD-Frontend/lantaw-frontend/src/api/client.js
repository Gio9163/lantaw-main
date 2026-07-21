import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const LIVE_PRODUCTION_API_URL = 'https://lantaw-main-bhn6.onrender.com';
const OBSOLETE_PRODUCTION_API_URL = 'https://lantaw-api.onrender.com';
const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const apiBaseUrl = import.meta.env.PROD && (
    !configuredApiUrl || configuredApiUrl === OBSOLETE_PRODUCTION_API_URL
)
    ? LIVE_PRODUCTION_API_URL
    : configuredApiUrl;

const api = axios.create({
    // If VITE_API_URL is not set (common in local dev), keep requests relative.
    // With Vite proxy configured, "/api/..." will be forwarded to Django.
    baseURL: apiBaseUrl,
})

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    
    failedQueue = [];
};

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config
    },
    (error) => {
        return Promise.reject(error);
    }
)

// Response interceptor to handle 401 errors and refresh tokens
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Skip interceptor for refresh token endpoint to prevent infinite loop
        if (originalRequest.url?.includes('/api/token/refresh/')) {
            return Promise.reject(error);
        }

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem(REFRESH_TOKEN);

            if (!refreshToken) {
                processQueue(error, null);
                isRefreshing = false;
                // Redirect to login or clear auth state
                window.location.href = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/login';
                return Promise.reject(error);
            }

            try {
                // Attempt to refresh the token (using axios directly to avoid interceptor)
                const response = await axios.post(
                    `${apiBaseUrl}/api/token/refresh/`,
                    { refresh: refreshToken }
                );

                const { access } = response.data;
                localStorage.setItem(ACCESS_TOKEN, access);

                // Dispatch a custom event to notify AuthContext of token update
                // This ensures the app state stays in sync
                window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { access } }));

                // Update the original request with new token
                originalRequest.headers['Authorization'] = `Bearer ${access}`;

                // Process queued requests
                processQueue(null, access);
                isRefreshing = false;

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                
                // Clear tokens and redirect to login
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                window.location.href = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
)

export default api;
