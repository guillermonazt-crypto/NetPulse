export const API_BASE = 'http://127.0.0.1:8000/api/';

export const ENDPOINTS = {
  TOKEN: 'token/',
  TOKEN_REFRESH: 'token/refresh/',
  METRICS: 'metrics/',
  ROUTERS: 'routers/',
  STATS: 'stats/',
  EVENTS: 'events/',
  HISTORICAL: 'historical/',
};

export const CONFIG = {
  POLL_INTERVAL: 5000,
  METRICS_LIMIT: 200,
  TOKEN_KEY: 'access_token',
  REFRESH_KEY: 'refresh_token',
  TABLE_ROWS: 15,
};
