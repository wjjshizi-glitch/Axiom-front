<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { all, api } from '../api'
import { resources, type Field } from '../resources'
import { useAuth } from '../stores/auth'
import { useEnvironments } from '../stores/environments'
const props = defineProps<{ resource: string; row: any; open: boolean; readonly?: boolean; initialScope?: string }>()
const emit = defineEmits(['close','saved'])
const form = ref<Record<string,any>>({}), options = ref<Record<string,any[]>>({}), saving = ref(false), error = ref('')
const auth = useAuth()
const environments = useEnvironments()
const systemRows = ref<any[]>([])
const connectionRows = ref<any[]>([])
const endpointOptions = ref<any[]>([])
const config = computed(() => resources[props.resource])
const fields = computed(() => config.value.fields.filter(f =>
  !(props.row?.kind === 'pytest' && f.key === 'endpoint') &&
  !(f.key === 'groups' && !auth.can('accounts.manage_roles')) &&
  !(f.key === 'members' && !auth.can('accounts.manage_users')) &&
  !(props.readonly && f.key === 'secrets')))
const visibleFields = computed(() => fields.value.filter(f => {
  if (props.resource !== 'environments') return true
  return Boolean(auth.user?.is_superuser) || f.key === 'personal_variables'
}))
watch(() => props.open, async open => {
  if (!open) return
  error.value = ''
  form.value = {}
  for (const f of fields.value) {
    const value = props.row?.[f.key] ?? (f.key === 'scope' ? props.initialScope : undefined) ?? f.default ?? (['multiple','permissions'].includes(f.type || '') ? [] : '')
    form.value[f.key] = f.type === 'json' ? (value === null ? '' : JSON.stringify(value, null, 2)) : JSON.parse(JSON.stringify(value))
    if (f.key === 'secrets') form.value[f.key] = ''
  }
  systemRows.value = (props.row?.systems || []).map((item:any) => ({
    ...item, credentials:'',
    login_extract:JSON.stringify(item.login_extract || {},null,2),
    headers:JSON.stringify(item.headers || {},null,2)}))
  connectionRows.value = Object.entries(props.row?.connection_summary || {}).flatMap(
    ([kind,rows]:any) => rows.map((row:any) => ({
      ...row, kind, password:'', extra:row.extra ? JSON.stringify(row.extra) : ''})))
  if (props.resource === 'endpoints') await environments.refresh()
  if (props.resource === 'environments' && auth.user?.is_superuser) {
    endpointOptions.value = await all('/endpoints/')
  }
  for (const source of new Set(fields.value.map(f => f.source).filter(Boolean))) {
    options.value[source!] = await all('/' + source + '/')
  }
  if (props.resource === 'roles') options.value.permissions = (await api.get('/roles/permissions/')).data
})
function choices(field: Field) {
  let rows = options.value[field.source || ''] || []
  if (props.resource === 'environments' && field.key === 'public_environment') {
    rows = rows.filter(row => row.scope === 'public')
  }
  if (['endpoints','cases'].includes(field.source || '') && form.value.project) rows = rows.filter(r => r.project === form.value.project)
  return rows
}
function environmentFieldChanged(field: Field) {
  if (props.resource !== 'environments' || field.key !== 'public_environment') return
  const selected = choices(field).find(row => row.id === form.value.public_environment)
  systemRows.value = (selected?.systems || []).map((item:any) => ({
    ...item, credentials:'', auth_config:JSON.stringify(item.auth_config || {},null,2)}))
}
function loginVariableNames(system:any) {
  try { return Object.keys(JSON.parse(system.login_extract || '{}')) } catch { return [] }
}
function variableReference(name:string) { return '{{' + name + '}}' }
function fieldOptions(field: Field) {
  if (props.resource === 'environments' && field.key === 'scope' && !props.row && !auth.user?.is_superuser) return ['private']
  return field.options || []
}
const addresses = computed(() => {
  const env = environments.current
  if (!env) return []
  return env.systems.map(system => ({key:system.system_key,url:system.base_url,name:system.name}))
})
const resolvedURL = computed(() => {
  const base = addresses.value.find(a => a.key === form.value.system_key)?.url
    || addresses.value[0]?.url
  if (!base) return '当前环境未配置此地址 Key'
  try { return new URL(form.value.path || '', base.replace(/\/$/,'') + '/').href } catch { return '地址格式无效' }
})
const codeExample = computed(() => {
  const method = form.value.function_name || 'get_device_detail'
  return 'from integrations.api_client import AxiomApiClient\n\n'
    + 'client = AxiomApiClient()\n'
    + 'response = client.' + method + '(\n'
    + '    path={}, query={}, headers={}, body={}\n'
    + ').assert_success()\n'
    + 'print(response.data)'
})
const permissionGroups = computed(() => {
  const groups: Record<string,any[]> = {}
  for (const p of options.value.permissions || []) (groups[p.page_path] ||= []).push(p)
  return groups
})
async function save() {
  error.value = ''
  const data: Record<string,any> = {}
  try {
    for (const f of visibleFields.value) {
      const value = form.value[f.key]
      if (f.required && (value === '' || value == null || (Array.isArray(value) && !value.length))) throw new Error('请填写' + f.label)
      if (f.key === 'password' && !value) continue
      if (f.key === 'secrets' && !value) continue
      data[f.key] = f.type === 'json' ? JSON.parse(value || '{}') : value
    }
    if (props.resource === 'environments' && auth.user?.is_superuser) {
      data.systems = systemRows.value.map(item => ({
        system_key:item.system_key,name:item.name,base_url:item.base_url,
        verify_ssl:item.verify_ssl,auth_config:{},
        login_endpoint:item.login_endpoint || null,
        login_extract:JSON.parse(item.login_extract || '{}'),
        login_expires_in:item.login_expires_in || 3600,
        headers:JSON.parse(item.headers || '{}'),
        ...(item.credentials ? {credentials:JSON.parse(item.credentials)} : {}),
      }))
      data.connections = connectionRows.value.reduce((result:any,item:any) => {
        const {kind,...connection} = item
        if (connection.extra) {
          try { connection.extra = JSON.parse(connection.extra) } catch { throw new Error('连接附加参数必须是 JSON') }
        }
        ;(result[kind] ||= []).push(connection)
        return result
      },{})
    }
    if (props.resource === 'users' && !props.row && !data.password) throw new Error('创建用户必须填写密码')
    saving.value = true
    if (props.resource === 'environments') {
      const personalVariables = data.personal_variables || {}
      delete data.personal_variables
      let environmentId = props.row?.id
      if (auth.user?.is_superuser) {
        if (props.row) await api.patch('/environments/' + props.row.id + '/', data)
        else environmentId = (await api.post('/environments/', data)).data.id
      }
      await api.put('/environments/' + environmentId + '/personal-variables/', {
        variables:personalVariables,
      })
    } else if (props.row) await api.patch('/' + props.resource + '/' + props.row.id + '/', data)
    else await api.post('/' + props.resource + '/', data)
    ElMessage.success('保存成功'); emit('saved')
  } catch (e: any) { error.value = e.message || '保存失败' }
  finally { saving.value = false }
}
</script>
<template>
  <el-drawer :model-value="open" :title="(readonly ? '查看' : row ? '编辑' : '新建') + config.singular" size="620px" @close="emit('close')" destroy-on-close>
    <el-alert v-if="error" :title="error" type="error" :closable="false" style="margin-bottom:20px"/>
    <el-alert v-if="resource === 'endpoints'" :title="'当前环境：' + (environments.current?.name || '未选择，请在顶部切换环境')" type="info" :closable="false" style="margin-bottom:18px"/>
    <el-alert v-if="resource === 'environments' && row && !auth.user?.is_superuser" :title="row.name + ' · ' + row.code + '（环境信息由 admin 统一维护）'" type="info" :closable="false" style="margin-bottom:18px"/>
    <el-form label-position="top" :disabled="readonly" @submit.prevent="save">
      <el-form-item v-for="field in visibleFields" :key="field.key" :label="field.label" :required="field.required">
        <div v-if="resource === 'environments' && field.type === 'systems'" class="nested-editor">
          <el-card v-for="(system,index) in systemRows" :key="index" class="nested-card" shadow="never">
            <div class="nested-grid">
              <el-input v-model="system.system_key" placeholder="system_key，如 user_server"/>
              <el-input v-model="system.name" placeholder="系统名称，如用户中心"/>
              <el-input v-model="system.base_url" placeholder="系统地址 https://api.example.com"/>
              <el-switch v-model="system.verify_ssl" active-text="校验 SSL"/>
              <el-select v-model="system.login_endpoint" clearable filterable placeholder="关联已添加的登录接口">
                <el-option v-for="endpoint in endpointOptions.filter(item => !system.system_key || item.system_key === system.system_key)" :key="endpoint.id" :value="endpoint.id" :label="endpoint.name + ' (' + endpoint.function_name + ')'"/>
              </el-select>
              <el-input v-model="system.login_extract" type="textarea" :rows="3" class="code-input" placeholder='响应变量 JSON，如 {"access_token":"$.access"}'/>
              <el-input-number v-model="system.login_expires_in" :min="60" :max="86400"/>
              <el-input v-model="system.headers" type="textarea" :rows="3" class="code-input" placeholder='该系统公共请求头，如 {"Authorization":"Bearer {{access_token}}"}'/>
              <div class="field-hint">登录变量有效期（秒）。可引用响应变量：<template v-if="loginVariableNames(system).length"><code v-for="name in loginVariableNames(system)" :key="name">{{ variableReference(name) }}</code></template><span v-else>请先配置响应变量</span></div>
              <el-input v-model="system.credentials" type="textarea" :rows="3" class="code-input" placeholder="系统级凭据 JSON，留空保留原值"/>
            </div>
            <el-button type="danger" plain @click="systemRows.splice(index,1)">移除系统</el-button>
          </el-card>
          <el-button @click="systemRows.push({system_key:'',name:'',base_url:'',verify_ssl:true,login_endpoint:null,login_extract:'{}',login_expires_in:3600,headers:'{}',credentials:''})">添加系统</el-button>
        </div>
        <div v-else-if="resource === 'environments' && field.type === 'connections'" class="nested-editor">
          <el-card v-for="(conn,index) in connectionRows" :key="index" class="nested-card" shadow="never"><div class="connection-grid"><el-select v-model="conn.kind"><el-option label="MySQL" value="mysql"/><el-option label="PostgreSQL" value="postgresql"/><el-option label="Redis" value="redis"/><el-option label="MQTT" value="mqtt"/></el-select><el-input v-model="conn.name" placeholder="连接名称"/><el-input v-model="conn.host" placeholder="主机"/><el-input-number v-model="conn.port" :min="1" :max="65535"/><el-input v-model="conn.username" placeholder="用户名（可选）"/><el-input v-model="conn.password" type="password" show-password placeholder="密码，留空保留"/><el-input v-model="conn.database" placeholder="数据库名 / Redis DB"/><el-input v-model="conn.extra" placeholder="附加参数 JSON（可选）"/></div><el-button type="danger" plain @click="connectionRows.splice(index,1)">移除连接</el-button></el-card>
          <el-button @click="connectionRows.push({kind:'mysql',name:'',host:'',port:3306,username:'',password:'',database:'',extra:''})">添加连接</el-button>
        </div>
        <el-switch v-else-if="field.type === 'switch'" v-model="form[field.key]"/>
        <el-select v-else-if="['select','multiple'].includes(field.type || '')" v-model="form[field.key]" :disabled="Boolean(row && (field.key === 'scope' || field.key === 'public_environment'))" :multiple="field.type === 'multiple'" filterable clearable style="width:100%" :placeholder="'请选择' + field.label" @change="environmentFieldChanged(field)">
          <el-option v-for="option in fieldOptions(field)" :key="option" :label="field.optionLabels?.[option] || option" :value="option"/>
          <el-option v-for="option in choices(field)" :key="option.id" :label="option.name || option.username" :value="option.id"/>
        </el-select>
        <div v-else-if="field.type === 'permissions'" class="permission-groups"><el-alert title="按前端页面授权；公共基础环境固定由超级管理员维护，不进入角色授权。" type="info" :closable="false"/><el-checkbox-group v-model="form[field.key]"><div v-for="(permissions,path) in permissionGroups" :key="path" class="permission-group"><h4>{{ permissions[0].page_name }} <code>{{ path }}</code></h4><el-checkbox v-for="p in permissions" :key="p.id" :value="p.id">{{ p.action_name }}</el-checkbox></div></el-checkbox-group></div>
        <el-input v-else-if="field.type === 'json' || field.type === 'textarea'" v-model="form[field.key]" type="textarea" :rows="field.type === 'json' ? 5 : 3" :class="{ 'code-input':field.type === 'json' }"/>
        <el-input v-else v-model="form[field.key]" :type="field.type === 'password' ? 'password' : 'text'" :show-password="field.type === 'password'" :autocomplete="field.type === 'password' ? 'new-password' : 'off'"/>
        <div v-if="field.hint" class="field-hint">{{ field.hint }}</div>
        <div v-if="resource === 'endpoints' && field.key === 'path'" class="url-preview">请求地址预览：{{ resolvedURL }}</div>
        <div v-if="resource === 'endpoints' && field.key === 'function_name'" class="code-example"><div>Python 调用示例</div><pre class="code-block">{{ codeExample }}</pre></div>
      </el-form-item>
    </el-form>
    <template #footer><el-button @click="emit('close')">{{ readonly ? '关闭' : '取消' }}</el-button><el-button v-if="!readonly" type="primary" @click="save" :loading="saving">保存{{ config.singular }}</el-button></template>
  </el-drawer>
</template>
