<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Search, RefreshCw, Play, ScanLine } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'
import { useAuth } from '../stores/auth'
import { resources } from '../resources'
import ResourceEditor from '../components/ResourceEditor.vue'
import RunDialog from '../components/RunDialog.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useEnvironments } from '../stores/environments'
import EndpointDebug from '../components/EndpointDebug.vue'
const route = useRoute(), router = useRouter(), auth = useAuth()
const resource = String(route.meta.path), config = resources[resource]
const environments = useEnvironments()
const readonly = ref(false)
const debugOpen = ref(false), debugEndpoint = ref<any>(null)
const rows = ref<any[]>([]), total = ref(0), page = ref(1), search = ref(''), loading = ref(false)
const selected = ref<any[]>([])
const editorOpen = ref(false), editing = ref<any>(null), runOpen = ref(false), runData = ref<any>({project:0})
const can = (action: string) => auth.can(resource === 'users' ? 'accounts.manage_users' : resource === 'roles' ? 'accounts.manage_roles' : 'automation.' + action + '_' + config.model)
async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/' + resource + '/', { params:{page:page.value, search:search.value} })
    rows.value = data.results; total.value = data.count
  } finally { loading.value = false }
}
function edit(row: any = null, viewOnly = false) { editing.value = row; readonly.value = viewOnly; editorOpen.value = true }
function createResource() { edit() }
async function saved() { editorOpen.value = false; await load(); if (resource === 'environments') await environments.refresh() }
async function remove(row: any) {
  try { await ElMessageBox.confirm('确定' + (resource === 'users' ? '停用' : '删除') + '「' + (row.name || row.username) + '」？', '确认操作', { type:'warning' }) } catch { return }
  await api.delete('/' + resource + '/' + row.id + '/'); ElMessage.success('操作成功'); await load()
  if (resource === 'environments') await environments.refresh()
}
async function activate(row: any) { await environments.activate(row.id); ElMessage.success('已切换当前环境') }
async function activateProject(row: any) {
  await api.post('/projects/' + row.id + '/activate/')
  await auth.fetchUser()
  await environments.refresh()
  await load()
  ElMessage.success('当前项目已切换为 ' + row.name)
}
function execute(row?: any) {
  const list = row ? [row] : selected.value
  if (!list.length) return
  if (new Set(list.map(r => r.project)).size > 1) { ElMessage.warning('请选择同一项目的用例'); return }
  runData.value = {project:list[0].project, ...(resource === 'suites' ? {suite:list[0].id} : {caseIds:list.map(r => r.id)})}
  runOpen.value = true
}
async function scan() {
  if (!auth.user?.current_project) { ElMessage.warning('请先在项目管理中切换项目'); return }
  const { data } = await api.post('/cases/scan/', {})
  ElMessage.success('新增 ' + data.added + ' 条，更新 ' + data.updated + ' 条')
  if (data.errors.length) ElMessage.warning(data.errors.join('；'))
  await load()
}
function filter() { page.value = 1; load() }
let timer: ReturnType<typeof setInterval>
onMounted(async () => {
  await load()
  if (resource === 'runs') timer = setInterval(load, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">WORKSPACE / {{ resource.toUpperCase() }}</div><h1>{{ route.meta.title }}</h1><p>{{ route.meta.subtitle }}</p></div>
    <div class="heading-actions"><el-button v-if="resource === 'cases' && auth.can('automation.scan_testcase')" @click="scan"><ScanLine :size="16"/>同步 Python 用例</el-button>
      <el-button v-if="config.fields.length && can('add') && (resource !== 'environments' || auth.user?.is_superuser)" type="primary" @click="createResource"><Plus :size="17"/>新建{{ config.singular }}</el-button>
    </div>
  </div>
  <section class="panel">
    <div class="panel-tabs">
      <template v-if="resource === 'environments'"><span class="active-tab">环境信息 <em>{{ total }}</em></span></template>
      <span v-else class="active-tab">全部{{ config.singular }} <em>{{ total }}</em></span><span class="panel-note">{{ resource === 'environments' ? '环境信息由 admin 维护 · 环境变量随个人账号' : '统一管理 · 高效协作' }}</span>
    </div>
    <div class="table-toolbar"><div class="filters"><el-input v-model="search" :prefix-icon="Search" placeholder="搜索名称、描述…" clearable @keyup.enter="filter" @clear="filter" style="width:260px"/>
      <el-button @click="filter">搜索</el-button></div>
      <div><el-button v-if="resource === 'cases' && auth.can('automation.execute_testrun')" :disabled="!selected.length" @click="execute()"><Play :size="15"/>批量执行 {{ selected.length || '' }}</el-button><el-button @click="load" :loading="loading" aria-label="刷新"><RefreshCw :size="15"/></el-button></div>
    </div>
    <el-table :data="rows" v-loading="loading" @selection-change="selected = $event" row-key="id">
      <el-table-column v-if="resource === 'cases'" type="selection" width="45"/>
      <el-table-column label="ID" prop="id" width="65"><template #default="{row}"><span class="muted">#{{ row.id }}</span></template></el-table-column>
      <el-table-column v-for="col in config.columns" :key="col.key" :label="col.label" :width="col.width" min-width="110" show-overflow-tooltip>
        <template #default="{row}">
          <StatusBadge v-if="col.type === 'status'" :value="row[col.key]"/>
          <el-tag v-else-if="col.type === 'scope'" :type="row.scope === 'public' ? 'success' : 'info'" size="small">{{ row.scope === 'public' ? '公共配置' : '私有配置' }}</el-tag>
          <span v-else-if="col.type === 'method'" class="method-badge" :class="row[col.key]">{{ row[col.key] }}</span>
          <span v-else-if="col.type === 'priority'" class="priority-badge" :class="row[col.key]">{{ row[col.key] }}</span>
          <span v-else-if="col.type === 'boolean'" :class="row[col.key] ? 'text-green' : 'muted'">{{ row[col.key] ? '已启用' : '已停用' }}</span>
          <span v-else-if="col.type === 'date'" class="muted">{{ new Date(row[col.key]).toLocaleString('zh-CN', {hour12:false}) }}</span>
          <span v-else-if="col.type === 'count'">{{ row[col.key]?.length || 0 }}</span>
          <span v-else-if="col.type === 'connection_summary'" class="connection-summary">{{ Object.entries(row[col.key] || {}).map(([kind, rows]:any) => kind.toUpperCase() + ' ' + rows.length).join(' · ') || '未配置' }}</span>
          <span v-else-if="col.type === 'json-summary'" class="mono">{{ Object.keys(row[col.key] || {}).length ? Object.keys(row[col.key]).join('、') : '未配置' }}</span>
          <span v-else-if="col.type === 'join'">{{ row[col.key]?.join(' / ') || '—' }}</span>
          <span v-else :class="{ 'cell-name':col.key === 'name', 'mono':col.key === 'path' }">{{ row[col.key] || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="resource !== 'audit-logs'" label="操作" fixed="right" width="220">
        <template #default="{row}"><div class="row-actions">
          <el-button v-if="resource === 'endpoints' && auth.can('automation.execute_testrun')" link type="primary" @click="debugEndpoint = row; debugOpen = true">调试</el-button>
          <el-button v-if="['cases','suites'].includes(resource) && auth.can('automation.execute_testrun')" link type="primary" @click="execute(row)">执行</el-button>
          <el-button v-if="resource === 'runs'" link type="primary" @click="router.push('/runs/' + row.id)">查看报告</el-button>
          <el-button v-if="resource === 'projects'" link type="primary" :disabled="row.is_current" @click="activateProject(row)">{{ row.is_current ? '当前项目' : '切换项目' }}</el-button>
          <el-button v-if="resource === 'environments'" link type="primary" :disabled="auth.user?.current_environment === row.id" @click="activate(row)">{{ auth.user?.current_environment === row.id ? '当前环境' : '设为当前' }}</el-button>
          <el-button v-if="resource === 'environments'" link @click="edit(row)">{{ auth.user?.is_superuser ? '编辑' : '环境变量' }}</el-button>
          <el-button v-if="config.fields.length && resource !== 'environments' && can('change')" link @click="edit(row)">编辑</el-button>
          <el-button v-if="resource === 'environments' ? auth.user?.is_superuser : can('delete')" link type="danger" @click="remove(row)">{{ resource === 'users' ? '停用' : '删除' }}</el-button>
        </div></template>
      </el-table-column>
      <template #empty><el-empty :description="'暂无' + config.singular + '，从新建开始'"/></template>
    </el-table>
    <div class="table-footer"><span>共 {{ total }} 条记录</span><el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" @current-change="load"/></div>
  </section>
  <ResourceEditor :resource="resource" :row="editing" :open="editorOpen" :readonly="readonly" @close="editorOpen = false" @saved="saved"/>
  <RunDialog :open="runOpen" :project="runData.project" :case-ids="runData.caseIds" :suite="runData.suite" @close="runOpen = false"/>
  <EndpointDebug :open="debugOpen" :endpoint="debugEndpoint" @close="debugOpen = false"/>
</template>
