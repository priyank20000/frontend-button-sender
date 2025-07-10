import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data?.message || error.message)
    
    // Handle blob responses for file downloads
    if (error.config?.responseType === 'blob' && error.response?.data instanceof Blob) {
      return Promise.reject(error)
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Authentication failed - clearing local storage')
      
      // Clear auth data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Only redirect to login if we're not already on the login page
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        console.log('Redirecting to login page')
        window.location.href = '/login'
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error or server is down')
    }
    
    return Promise.reject(error)
  }
)

export default api