import axios from 'axios';

// Адреса серверов. Можно переопределить в файле .env (см. .env.example),
// по умолчанию используются локальные.
export const TRAINS_API_URL = import.meta.env.VITE_TRAINS_API_URL || 'http://127.0.0.1:8000';
export const NEWS_API_URL = import.meta.env.VITE_NEWS_API_URL || 'http://127.0.0.1:8001';

// FastAPI: поезда, места, заказы
export const trainsApi = axios.create({ baseURL: TRAINS_API_URL });

// Django: новости, вход, регистрация
export const newsApi = axios.create({ baseURL: NEWS_API_URL });

// Текст ошибки из ответа сервера: detail у FastAPI, error у Django
export function apiErrorMessage(err, fallback = 'Не удалось связаться с сервером') {
  const data = err.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.error === 'string') return data.error;
  return fallback;
}