export const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '')
  : `http://${window.location.hostname}:5001`;

export const API_BASE_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL;
