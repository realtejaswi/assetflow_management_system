import axios from 'axios'

const BANK_API_URL = import.meta.env.VITE_BANK_API_URL || 'http://localhost:8001'

export const bankApi = axios.create({
  baseURL: BANK_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token
bankApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('bank_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
bankApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = sessionStorage.getItem('bank_refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BANK_API_URL}/auth/refresh`, { refresh_token: refresh })
          sessionStorage.setItem('bank_access_token', data.access_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return bankApi(error.config)
        } catch {
          sessionStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default bankApi
