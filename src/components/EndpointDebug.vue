<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { useEnvironments } from '../stores/environments'
const props = defineProps<{open:boolean; endpoint:any}>(), emit = defineEmits(['close'])
const environments = useEnvironments(), loading = ref(false), result = ref<any>(null), error = ref('')
const headers = ref('{}'), query = ref('{}'), body = ref('{}'), useAuth = ref(true)
watch(() => props.open, async value => {
  if (!value || !props.endpoint) return
  result.value = null; error.value = ''
  headers.value = JSON.stringify(props.endpoint.headers,null,2)
  query.value = JSON.stringify(props.endpoint.query,null,2)
  body.value = JSON.stringify(props.endpoint.body,null,2)
  useAuth.value = props.endpoint.use_auth
  await environments.refresh()
})
async function send() {
  error.value = ''; loading.value = true; result.value = null
  try {
    const {data} = await api.post('/endpoints/' + props.endpoint.id + '/debug/', {
      environment:environments.current?.id,
      overrides:{headers:JSON.parse(headers.value),query:JSON.parse(query.value),body:JSON.parse(body.value),use_auth:useAuth.value},
    }, {timeout:65000})
    result.value = data
    if (data.authentication_expired) ElMessage.warning('Token 已失效，请重新登录被测系统')
    await environments.refresh()
  } catch(e:any) { error.value = e.response?.data?.detail || JSON.stringify(e.response?.data) || e.message }
  finally { loading.value = false }
}
</script>
<template>
  <el-drawer :model-value="open" :title="'接口调试 · ' + (endpoint?.name || '')" size="760px" @close="emit('close')">
    <p>当前环境：{{ environments.current?.name || '未选择' }} · 所属系统：{{ endpoint?.system_key }}</p>
    <p class="mono">{{ endpoint?.method }} {{ endpoint?.path }}</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false"/>
    <el-switch v-model="useAuth" active-text="使用环境认证 Token"/>
    <el-tabs><el-tab-pane label="Query"><el-input v-model="query" type="textarea" :rows="5" class="code-input" aria-label="调试 Query"/></el-tab-pane><el-tab-pane label="Headers"><el-input v-model="headers" type="textarea" :rows="5" class="code-input" aria-label="调试 Headers"/></el-tab-pane><el-tab-pane label="Body"><el-input v-model="body" type="textarea" :rows="7" class="code-input" aria-label="调试 Body"/></el-tab-pane></el-tabs>
    <template v-if="result">
      <div class="debug-json"><h4>响应状态 {{ result.response.status }} · {{ result.duration_ms.toFixed(0) }} ms</h4><pre class="code-block">{{ JSON.stringify(result.response.body,null,2) }}</pre></div>
      <el-collapse><el-collapse-item title="请求详情（敏感信息已隐藏）"><pre class="code-block">{{ JSON.stringify(result.request,null,2) }}</pre></el-collapse-item><el-collapse-item title="响应头"><pre class="code-block">{{ JSON.stringify(result.response.headers,null,2) }}</pre></el-collapse-item></el-collapse>
    </template>
    <template #footer><el-button @click="emit('close')">关闭</el-button><el-button type="primary" :disabled="!environments.current" :loading="loading" @click="send">发送请求</el-button></template>
  </el-drawer>
</template>
