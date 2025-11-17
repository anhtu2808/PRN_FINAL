import axios from "axios";

const axiosInstance = axios.create({
  // baseURL: "https://swd-grading.anhtudev.cloud/api",
  baseURL: "http://localhost:5064/api",
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
    
    // Thêm token vào header nếu có
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
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
    // Xử lý lỗi 401 (Unauthorized) - token hết hạn hoặc không hợp lệ
    if (error.response && error.response.status === 401) {
      // Xóa token khỏi localStorage
      localStorage.removeItem("token");
      // Redirect về trang login nếu không phải đang ở trang login
      if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

