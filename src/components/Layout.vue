<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, FolderKanban, Network, FlaskConical, Layers, History, Globe2, Users, ShieldCheck, LogOut, Command } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import { sections } from '../router'
import { useEnvironments } from '../stores/environments'
const route = useRoute(), router = useRouter(), auth = useAuth()
const environments = useEnvironments()
onMounted(() => environments.refresh())
async function switchEnvironment(id: number) {
  await environments.activate(id)
  ElMessage.success('当前环境已切换为 ' + environments.current?.name)
}
function refreshOptions(open: boolean) { if (open) environments.refresh() }
const icons: Record<string, any> = { dashboard: LayoutDashboard, projects: FolderKanban, endpoints: Network, cases: FlaskConical, suites: Layers, runs: History, environments: Globe2, users: Users, roles: ShieldCheck }
const visible = computed(() => sections.filter(s => auth.can(s.permission)))
async function logout() { await auth.logout(); router.push('/login') }
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar">
      <router-link to="/" class="brand"><span class="brand-symbol"><Command :size="23"/></span><span>axiom<span class="brand-dot">.</span><small>API AUTOMATION</small></span></router-link>
      <div class="workspace-pill"><span class="workspace-avatar">A</span><div>测试工作空间<small>Axiom Workspace</small></div></div>
      <div class="nav-caption">工作空间</div>
      <nav><template v-for="item in visible" :key="item.path">
        <div v-if="item.path === 'users'" class="nav-caption system-caption">系统管理</div>
        <router-link :to="'/' + item.path" class="nav-item" :class="{ active: route.path.startsWith('/' + item.path) }">
          <component :is="icons[item.icon]" :size="18"/><span>{{ item.title }}</span><span v-if="item.path === 'cases'" class="nav-label">API</span>
        </router-link>
      </template></nav>
      <div class="sidebar-bottom"><div class="help-card">让每一次发布更有信心<small>接口测试 · 持续交付</small></div>
        <router-link to="/profile" class="user-card"><span class="avatar">{{ (auth.user?.display_name || auth.user?.username || 'U').slice(0,1) }}</span><div>{{ auth.user?.display_name || auth.user?.username }}<small>{{ auth.user?.is_superuser ? '超级管理员' : '团队成员' }}</small></div></router-link>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb">工作空间 <span>/</span> <strong>{{ route.meta.title }}</strong></div>
        <div class="top-environment"><span>当前项目：{{ auth.user?.current_project_name || '未选择' }}</span><span>当前环境</span><el-select aria-label="当前环境" :model-value="environments.current?.id" :loading="environments.loading" placeholder="请选择环境" @visible-change="refreshOptions" @change="switchEnvironment">
          <el-option v-for="env in environments.items" :key="env.id" :label="env.name + ' · ' + env.code" :value="env.id"/>
        </el-select><button class="icon-button" title="退出登录" @click="logout"><LogOut :size="18"/></button></div>
      </header>
      <main class="page-content"><router-view :key="route.path"/></main>
      <footer class="page-footer">AXIOM · 为高效测试而构建 <span>v1.0.0</span></footer>
    </div>
  </div>
</template>
