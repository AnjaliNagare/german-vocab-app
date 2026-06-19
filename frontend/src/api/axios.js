import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://german-vocab-app-l0q4.onrender.com',
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response, // If the request succeeds, just pass it through
  (error) => {
    // If the server returns a 403 or 401, the token is invalid or expired
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      console.warn("Token expired or unauthorized. Logging out...");
      
      localStorage.removeItem('token'); // Clear the bad token
      window.location.href = '/login';   // Force redirect to login page
    }
    return Promise.reject(error);
  }
);

export default api;