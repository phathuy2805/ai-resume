import axios from 'axios';
import { toApiError } from './apiError';

// Cookie endpoints never enter the Bearer/401 retry interceptor.
export const authTransport = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
});
authTransport.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
