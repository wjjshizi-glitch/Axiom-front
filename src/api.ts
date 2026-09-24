import axios from 'axios'
import { ElMessage } from 'element-plus'

export const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
export const api = axios.create({ baseURL, timeout: 20000 })
let refreshing: Promise<string> | null = null
export function clearSession() {
  sessionStorage.removeItem('access')
  sessionStorage.removeItem('refresh')
}
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('access')
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})
api.interceptors.response.use(response => response, async error => {
  const config = error.config
  if (error.response?.status === 401 && config && !config._retry && !config.url?.includes('/auth/')) {
    config._retry = true
    const refresh = sessionStorage.getItem('refresh')
    if (refresh) {
      try {
        refreshing ||= axios.post(baseURL + '/auth/refresh/', { refresh }).then(({ data }) => {
          sessionStorage.setItem('access', data.access)
          sessionStorage.setItem('refresh', data.refresh)
          return data.access as string
        }).finally(() => { refreshing = null })
        await refreshing
        return api(config)
      } catch {
        clearSession()
        window.location.assign('/login')
        return Promise.reject(error)
      }
    }
    clearSession()
    window.location.assign('/login')
  }
  const data = error.response?.data
  const message = data?.detail || (data ? Object.entries(data).map(([k, v]) => k + ': ' + String(v)).join('；') : '无法连接服务，请检查后端是否启动')
  ElMessage.error(String(message).slice(0, 400))
  return Promise.reject(error)
})
export async function all(path: string, params: Record<string, unknown> = {}) {
  const rows: any[] = []
  let page = 1
  while (true) {
    const { data } = await api.get(path, { params: { ...params, page } })
    if (Array.isArray(data)) return data
    rows.push(...data.results)
    if (!data.next) return rows
    page++
  }
}
