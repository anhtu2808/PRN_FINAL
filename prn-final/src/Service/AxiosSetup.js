import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://localhost:7084/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Nếu là FormData, không set Content-Type để browser tự set với boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    // Có thể thêm token hoặc các headers khác ở đây
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;

