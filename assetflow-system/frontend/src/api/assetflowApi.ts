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

export default assetflowApi
