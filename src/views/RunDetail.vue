<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Download, ArrowLeft, Square } from 'lucide-vue-next'
import { api } from '../api'
import { useAuth } from '../stores/auth'
import StatusBadge from '../components/StatusBadge.vue'
const route = useRoute(), auth = useAuth(), run = ref<any>(null), loading = ref(true)
const active = computed(() => ['queued','running'].includes(run.value?.status))
let timer: ReturnType<typeof setTimeout>
async function load() {
  try { run.value = (await api.get('/runs/' + route.params.id + '/')).data }
  finally { loading.value = false }
  if (active.value) timer = setTimeout(load, 2000)
}
onMounted(load); onUnmounted(() => clearTimeout(timer))
async function cancel() { await api.post('/runs/' + route.params.id + '/cancel/'); clearTimeout(timer); await load() }
async function download() {
  const { data } = await api.get('/runs/' + route.params.id + '/report/', { responseType:'blob' })
  const url = URL.createObjectURL(data), anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'axiom-report-' + route.params.id + '.html'; anchor.click(); URL.revokeObjectURL(url)
}
</script>
<template>
  <div v-loading="loading"><router-link class="back-link" to="/runs"><ArrowLeft :size="15"/>返回执行记录</router-link>
    <template v-if="run"><div class="page-heading"><div><div class="eyebrow">TEST RUN / #{{ run.id }}</div><h1>{{ run.name }}</h1><p>{{ run.project_name }} · {{ run.environment_name }} · {{ run.created_by_name }}</p></div><div class="heading-actions"><el-button v-if="active && auth.can('automation.cancel_testrun')" @click="cancel"><Square :size="14"/>取消任务</el-button><el-button @click="download" type="primary"><Download :size="16"/>下载报告</el-button></div></div>
    <div class="run-summary panel"><StatusBadge :value="run.status"/><div>总用例<strong>{{ run.total }}</strong></div><div>通过<strong class="text-green">{{ run.passed }}</strong></div><div>失败<strong class="text-red">{{ run.failed }}</strong></div><div>未完成<strong>{{ run.total - run.passed - run.failed }}</strong></div><div class="run-progress"><el-progress :percentage="Math.round((run.passed + run.failed) / Math.max(1,run.total) * 100)"/><small>{{ active ? '状态每 2 秒自动更新' : '执行已结束' }}</small></div></div>
    <el-alert v-if="run.status === 'queued'" title="任务已进入队列，请确保后端 Worker 正在运行。" type="info" :closable="false" style="margin:20px 0"/>
    <section class="panel results-panel"><div class="panel-heading"><h3>用例结果</h3><span class="muted">展开查看请求、响应与断言</span></div>
      <el-collapse><el-collapse-item v-for="result in run.results" :key="result.id" :name="result.id"><template #title><div class="result-title"><StatusBadge :value="result.status"/><strong>{{ result.name }}</strong><span>{{ result.duration_ms.toFixed(0) }} ms</span></div></template>
        <el-alert v-if="result.error" :title="result.error" type="error" :closable="false"/>
        <el-tabs><el-tab-pane label="断言结果"><el-table :data="result.assertions"><el-table-column prop="source" label="来源"/><el-table-column prop="path" label="路径"/><el-table-column prop="operator" label="条件"/><el-table-column label="期望"><template #default="{row}">{{ JSON.stringify(row.expected) }}</template></el-table-column><el-table-column label="实际"><template #default="{row}">{{ JSON.stringify(row.actual) }}</template></el-table-column><el-table-column label="结果"><template #default="{row}"><StatusBadge :value="row.passed ? 'passed' : 'failed'"/></template></el-table-column></el-table></el-tab-pane>
          <el-tab-pane label="请求"><pre class="code-block">{{ JSON.stringify(result.request,null,2) }}</pre></el-tab-pane><el-tab-pane label="响应"><pre class="code-block">{{ JSON.stringify(result.response,null,2) }}</pre></el-tab-pane><el-tab-pane label="Python 日志"><pre class="code-block">{{ result.log || '无 Python 日志' }}</pre></el-tab-pane>
        </el-tabs>
      </el-collapse-item></el-collapse><el-empty v-if="!run.results.length" description="等待执行结果"/>
    </section>
    <section class="panel log-panel"><div class="panel-heading"><h3>执行日志</h3></div><pre class="code-block">{{ run.log || '等待 Worker 执行…' }}</pre></section>
    </template>
  </div>
</template>
