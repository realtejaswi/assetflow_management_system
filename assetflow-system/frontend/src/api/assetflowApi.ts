import axios from 'axios'

const BASE_URL = import.meta.env.VITE_ASSETFLOW_API_URL || 'http://localhost:8002'

export const assetflowApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ML Service
const ML_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8005'
export const mlApi = axios.create({ baseURL: ML_URL })

// AI Service
const AI_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8006'
export const aiApi = axios.create({ baseURL: AI_URL })

// Tax Service
const TAX_URL = import.meta.env.VITE_TAX_SERVICE_URL || 'http://localhost:8007'
export const taxApi = axios.create({ baseURL: TAX_URL, responseType: 'json' })

// The Bank Service
const BANK_URL = import.meta.env.VITE_BANK_API_URL || 'http://localhost:8001'
export const bankApi = axios.create({ baseURL: BANK_URL, headers: { 'Content-Type': 'application/json' } })

// Attach JWT token for bankApi
bankApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('assetflow_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401 for bankApi
bankApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('assetflow_refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BANK_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('assetflow_access_token', data.access_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return bankApi(error.config)
        } catch {
          localStorage.removeItem('assetflow_access_token')
          localStorage.removeItem('assetflow_refresh_token')
          localStorage.removeItem('assetflow_user_id')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default assetflowApi
