import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores';
import type { ApiEnvelope, AuthToken } from '@/types/auth';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const http = axios.create({
  baseURL,
  timeout: 15000
});

const refreshClient = axios.create({
  baseURL,
  timeout: 15000
});

function attachAuth(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = useAuthStore.getState().token?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

http.interceptors.request.use(attachAuth);

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null): void {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const state = useAuthStore.getState();
    const refreshToken = state.token?.refresh_token;
    if (!refreshToken) {
      state.clearLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(http(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const resp = await refreshClient.post<ApiEnvelope<AuthToken>>('/auth/refresh', {
        refresh_token: refreshToken
      });
      const current = useAuthStore.getState();
      if (!current.user) {
        current.clearLogin();
        return Promise.reject(error);
      }
      current.setLogin(resp.data.data, current.user);
      resolveQueue(resp.data.data.access_token);
      originalRequest.headers.Authorization = `Bearer ${resp.data.data.access_token}`;
      return http(originalRequest);
    } catch (refreshErr) {
      resolveQueue(null);
      useAuthStore.getState().clearLogin();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
