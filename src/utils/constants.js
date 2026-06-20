export const BASE_URL =
  import.meta.env.DEV
    ? "/api"
    : import.meta.env.VITE_API_BASE_URL || "/api";
