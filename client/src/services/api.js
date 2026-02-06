import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

// Interceptor to add JWT token to all requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Optional: Interceptor to handle unauthenticated responses
api.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        // Handle unauthorized (e.g., redirect to login or clear state)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload(); // Simple way to reset state
    }
    return Promise.reject(error);
});

export default api;
