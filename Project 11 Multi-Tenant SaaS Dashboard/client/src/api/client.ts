import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Extracts the server's { success, data, message } message from any axios error
// so components can show real feedback instead of "Request failed with status 4xx".
export const apiError = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiResponse<null> | undefined;
    if (body?.message) return body.message;
  }
  return 'Something went wrong. Please try again.';
};
