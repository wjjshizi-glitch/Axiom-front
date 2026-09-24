<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { useEnvironments } from '../stores/environments'
const props = defineProps<{ open:boolean }>(), emit = defineEmits(['close'])
const environments = useEnvironments(), credentials = ref('{}'), loading = ref(false), error = ref('')
const systemKey = ref('')
const loginSystems = () => environments.current?.systems.filter(
  system => system.login_endpoint || Object.keys(system.auth_config || {}).length) || []
function fillCredentialTemplate() {
  const system = environments.current?.systems_by_key[systemKey.value]
  const names = system?.login_parameters || []
  credentials.value = JSON.stringify(Object.fromEntries(names.map(n => [n,''])),null,2)
}
watch(() => props.open, async value => {
  if (!value) { credentials.value = '{}'; return }
  error.value = ''
  await environments.refresh()
  systemKey.value = loginSystems()[0]?.system_key || ''
  fillCredentialTemplate()
})
watch(systemKey, fillCredentialTemplate)
async function login() {
  loading.value = true; error.value = ''
  try {
    await api.post('/environments/' + environments.current?.id + '/login-system/', {system_key:systemKey.value,credentials:JSON.parse(credentials.value)})
    credentials.value = '{}'; await environments.refresh(); ElMessage.success('关联登录接口执行成功，响应变量已关联当前账号和环境'); emit('close')
  } catch (e:any) { error.value = e.response?.data?.detail || e.message }
  finally { loading.value = false }
}
async function logout() {
  await api.post('/environments/' + environments.current?.id + '/logout-system/', {system_key:systemKey.value})
  await environments.refresh(); emit('close')
}
</script>
<template>
  <el-dialog :model-value="open" title="执行关联登录接口" width="540px" @close="emit('close')">
    <p>当前环境：{{ environments.current?.name || '未选择' }}</p>
    <el-select v-model="systemKey" placeholder="选择已关联登录接口的系统" style="width:100%;margin-bottom:16px"><el-option v-for="system in loginSystems()" :key="system.system_key" :label="system.name + ' (' + system.system_key + ')'" :value="system.system_key"/></el-select>
    <el-alert v-if="!systemKey" title="当前环境尚未关联登录接口，请由 admin 在环境配置中设置。" type="info" :closable="false"/>
    <template v-else>
      <el-alert v-if="error" :title="error" type="error" :closable="false"/>
      <p class="muted">填写关联登录接口中的变量，仅用于本次请求，不保存密码。</p>
      <el-input v-model="credentials" type="textarea" :rows="8" class="code-input" aria-label="系统登录参数" spellcheck="false"/>
      <p class="field-hint">响应变量按当前账号和环境保存，可供公共请求头引用。</p>
      <p v-if="environments.current?.authentication?.[systemKey]?.authenticated" class="text-green">变量已关联 · 过期时间 {{ new Date(environments.current.authentication[systemKey].expires_at!).toLocaleString() }}</p>
    </template>
    <template #footer><el-button @click="emit('close')">关闭</el-button><el-button v-if="environments.current?.authentication?.[systemKey]?.authenticated" @click="logout">清除关联变量</el-button><el-button type="primary" :disabled="!systemKey" :loading="loading" @click="login">执行登录接口并提取变量</el-button></template>
  </el-dialog>
</template>
