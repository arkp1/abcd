import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

/**
 * Fetch actual wind generation data
 */
export const fetchActuals = async (dateFrom, dateTo) => {
  const params = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const response = await api.get('/api/actuals', { params });
  return response.data;
};

/**
 * Fetch wind generation forecasts
 */
export const fetchForecasts = async (dateFrom, dateTo) => {
  const params = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const response = await api.get('/api/forecasts', { params });
  return response.data;
};

/**
 * Fetch forecast vs actual comparison data
 */
export const fetchForecastVsActual = async (dateFrom, dateTo) => {
  const params = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const response = await api.get('/api/forecast-vs-actual', { params });
  return response.data;
};

/**
 * Fetch forecast accuracy metrics
 */
export const fetchForecastAccuracy = async (dateFrom, dateTo) => {
  const params = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const response = await api.get('/api/forecast-accuracy', { params });
  return response.data;
};

/**
 * Fetch how forecasts for a target date evolved over time
 */
export const fetchForecastEvolution = async (targetDate) => {
  const params = {};
  if (targetDate) params.target_date = targetDate;
  const response = await api.get('/api/forecast-evolution', { params });
  return response.data;
};

/**
 * Check API health status
 */
export const fetchHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};
