<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FolderKanban, FlaskConical, Activity, CheckCircle2, ArrowRight, Plus } from 'lucide-vue-next'
import { api } from '../api'
import { useAuth } from '../stores/auth'
import StatusBadge from '../components/StatusBadge.vue'
const auth = useAuth(), data = ref<any>(null), loading = ref(true)
onMounted(async () => { try { data.value = (await api.get('/dashboard/')).data } finally { loading.value = false } })
const rate = computed(() => data.value && data.value.passed + data.value.failed ? Math.round(data.value.passed / (data.value.passed + data.value.failed) * 100) : 0)
const metrics = computed(() => [
  {label:'项目总数',value:data.value?.projects || 0,icon:FolderKanban,note:'团队测试资产',color:'blue'},
  {label:'测试用例',value:data.value?.cases || 0,icon:FlaskConical,note:'HTTP 与 Python 用例',color:'violet'},
  {label:'累计执行',value:data.value?.runs || 0,icon:Activity,note:(data.value?.active_runs || 0) + ' 个任务进行中',color:'orange'},
  {label:'用例通过率',value:rate.value + '%',icon:CheckCircle2,note:'基于已完成用例',color:'green'},
])
const days = computed(() => Array.from({length:7}, (_,i) => {
  const day = new Date(); day.setDate(day.getDate() - 6 + i)
  const item = data.value?.trend.find((r:any) => r.day === day.toLocaleDateString('sv-SE'))
  return {label:(day.getMonth()+1) + '/' + day.getDate(), passed:item?.passed || 0, failed:item?.failed || 0}
}))
const max = computed(() => Math.max(1, ...days.value.map(d => d.passed + d.failed)))
</script>
<template>
  <div v-loading="loading">
    <div class="page-heading"><div><div class="eyebrow">OVERVIEW</div><h1>工作台</h1><p>你好，{{ auth.user?.display_name || auth.user?.username }}。今天也让每一次交付更可靠。</p></div><router-link to="/cases"><el-button type="primary"><Plus :size="16"/>管理测试用例</el-button></router-link></div>
    <div class="welcome-banner"><div><span class="banner-tag">YOUR QUALITY COMPANION</span><h2>从一次测试，到持续的信心。</h2><p>连接接口、环境与团队，在一个工作空间完成自动化回归。</p><router-link to="/suites">开始一次测试 <ArrowRight :size="16"/></router-link></div><div class="banner-art"><div class="orbit one"></div><div class="orbit two"></div><div class="art-center"><FlaskConical :size="43"/></div><span class="art-chip chip-one"><CheckCircle2 :size="15"/>测试就绪</span><span class="art-chip chip-two"><Activity :size="15"/>持续验证</span></div></div>
    <div class="metric-grid"><div v-for="m in metrics" :key="m.label" class="metric-card"><div class="metric-top"><span>{{ m.label }}</span><span class="metric-icon" :class="m.color"><component :is="m.icon" :size="19"/></span></div><strong>{{ m.value }}</strong><small>{{ m.note }}</small></div></div>
    <div class="dashboard-grid">
      <section class="panel chart-panel"><div class="panel-heading"><h3>近 7 天执行趋势</h3><span class="chart-legend"><i></i>通过 <i class="red"></i>失败</span></div>
        <div class="bar-chart"><div v-for="day in days" :key="day.label" class="chart-day"><span class="bar-total">{{ day.passed + day.failed || '' }}</span><div class="bar-stack" :title="'通过 ' + day.passed + ' / 失败 ' + day.failed"><div class="bar-failed" :style="{height:(day.failed / max * 140) + 'px'}"></div><div class="bar-passed" :style="{height:Math.max(3, day.passed / max * 140) + 'px'}"></div></div><span>{{ day.label }}</span></div></div>
      </section>
      <section class="panel quick-panel"><div class="panel-heading"><h3>快速开始</h3><span class="muted">QUICK START</span></div><router-link to="/environments"><span class="quick-number">01</span><div>配置测试环境<small>设置域名、变量与服务凭据</small></div><ArrowRight :size="17"/></router-link><router-link to="/cases"><span class="quick-number">02</span><div>构建测试用例<small>定义请求、断言与数据提取</small></div><ArrowRight :size="17"/></router-link><router-link to="/suites"><span class="quick-number">03</span><div>运行回归测试<small>编排套件，获取执行报告</small></div><ArrowRight :size="17"/></router-link></section>
    </div>
    <section class="panel recent-panel"><div class="panel-heading"><h3>最近执行</h3><router-link to="/runs">查看全部 <ArrowRight :size="14"/></router-link></div><el-table :data="data?.recent_runs || []"><el-table-column prop="name" label="执行名称" min-width="220"/><el-table-column label="状态" width="120"><template #default="{row}"><StatusBadge :value="row.status"/></template></el-table-column><el-table-column prop="environment_name" label="测试环境"/><el-table-column label="通过 / 总数"><template #default="{row}"><span class="text-green">{{ row.passed }}</span> / {{ row.total }}</template></el-table-column><el-table-column label="执行时间" min-width="165"><template #default="{row}">{{ new Date(row.created_at).toLocaleString('zh-CN',{hour12:false}) }}</template></el-table-column><el-table-column width="100"><template #default="{row}"><router-link :to="'/runs/' + row.id">查看详情</router-link></template></el-table-column><template #empty><el-empty description="还没有执行记录，运行你的第一个测试套件"/></template></el-table></section>
  </div>
</template>
