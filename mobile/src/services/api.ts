/**
 * FoodWiseAI — Axios Instance
 *
 * Configured HTTP client for backend API communication.
 */

import axios from "axios";

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = rawBaseUrl.endsWith("/api/v1") ? rawBaseUrl : `${rawBaseUrl}/api/v1`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — will be configured with auth tokens in Phase 2
api.interceptors.request.use(
  (config) => {
    // TODO: Attach JWT token from secure storage
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — will be configured with token refresh in Phase 2
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: Handle 401 and attempt token refresh
    return Promise.reject(error);
  }
);

export default api;
