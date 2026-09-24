import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, clearSession } from '../api'
export interface User {
  id: number; username: string; display_name: string; email: string
  is_superuser: boolean; permissions: string[]; role_names: string[]
  current_project: number | null; current_project_name: string | null
  current_environment: number | null
}
export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const can = (permission: string) => Boolean(user.value && (permission === 'automation.view_environment' || user.value.is_superuser || user.value.permissions.includes(permission)))
  async function fetchUser() { user.value = (await api.get('/auth/me/')).data }
  async function login(username: string, password: string) {
    const { data } = await api.post('/auth/login/', { username, password })
    sessionStorage.setItem('access', data.access)
    sessionStorage.setItem('refresh', data.refresh)
    await fetchUser()
  }
  async function logout() {
    try { await api.post('/auth/logout/', { refresh: sessionStorage.getItem('refresh') }) }
    finally { clearSession(); user.value = null }
  }
  return { user, can, login, logout, fetchUser }
})
