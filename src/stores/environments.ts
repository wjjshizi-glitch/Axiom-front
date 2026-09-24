import { defineStore } from 'pinia'
import { ref } from 'vue'
import { all, api } from '../api'
import { useAuth } from './auth'

export interface Environment {
  id: number; name: string; scope: 'public' | 'private'; owner: number
  owner_name: string; code: string; can_edit: boolean; can_delete: boolean
  systems: EnvironmentSystem[]; systems_by_key: Record<string,EnvironmentSystem>
  authentication: Record<string,{ configured:boolean; authenticated:boolean; expires_at:string | null }>
  connection_summary: Record<string,any[]>
}
export interface EnvironmentSystem {
  id?:number; system_key:string; name:string; base_url:string; verify_ssl:boolean
  auth_config:Record<string,any>; has_credentials?:boolean; credentials?:Record<string,any>
  login_endpoint?:number | null; login_endpoint_name?:string
  login_extract?:Record<string,string>; login_expires_in?:number
  login_parameters?:string[]; headers?:Record<string,string>
}
export const useEnvironments = defineStore('environments', () => {
  const items = ref<Environment[]>([]), current = ref<Environment | null>(null), loading = ref(false)
  async function refresh() {
    const [environments, response] = await Promise.all([all('/environments/'), api.get('/environments/current/')])
    items.value = environments
    current.value = response.data.environment
    const auth = useAuth()
    if (auth.user) auth.user.current_environment = current.value?.id || null
  }
  async function activate(id: number) {
    loading.value = true
    try {
      await api.post('/environments/' + id + '/activate/')
      await refresh()
    } finally { loading.value = false }
  }
  return { items, current, loading, refresh, activate }
})
