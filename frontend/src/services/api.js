import axios from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://localhost:7271").replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${API_BASE_URL}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

export function getApiErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.code === "ERR_NETWORK") {
    return "No se pudo conectar con el backend. Revisa que la API esté corriendo y que VITE_API_URL apunte al puerto correcto.";
  }
  return error.message || "Ocurrió un error inesperado.";
}

export default api;
