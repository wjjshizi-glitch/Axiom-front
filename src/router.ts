import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
export const sections = [
  { path: 'dashboard', title: '工作台', subtitle: '掌握每一次测试，让质量清晰可见', permission: 'automation.view_testrun', icon: 'dashboard' },
  { path: 'projects', title: '项目管理', subtitle: '组织测试资产，让团队有序协作', permission: 'automation.view_project', icon: 'projects' },
  { path: 'endpoints', title: '接口管理', subtitle: '统一管理服务接口与请求定义', permission: 'automation.view_endpoint', icon: 'endpoints' },
  { path: 'cases', title: '测试用例', subtitle: '从单个接口到完整场景，构建可靠的测试覆盖', permission: 'automation.view_testcase', icon: 'cases' },
  { path: 'suites', title: '测试套件', subtitle: '编排有序的测试流程，一键完成回归', permission: 'automation.view_suite', icon: 'suites' },
  { path: 'runs', title: '执行记录', subtitle: '追踪执行进度，定位每一个失败原因', permission: 'automation.view_testrun', icon: 'runs' },
  { path: 'environments', title: '环境配置', subtitle: '环境信息统一维护，环境变量按个人账号隔离', permission: 'automation.view_environment', icon: 'environments' },
  { path: 'users', title: '用户管理', subtitle: '管理团队账号和角色分配', permission: 'accounts.manage_users', icon: 'users' },
  { path: 'roles', title: '角色权限', subtitle: '按职责授权，控制每一项操作', permission: 'accounts.manage_roles', icon: 'roles' },
]
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('./views/Login.vue') },
    { path: '/', component: () => import('./components/Layout.vue'), children: [
      { path: '', redirect: '/dashboard' },
      ...sections.map(s => ({ path: s.path, meta: s, component: s.path === 'dashboard'
        ? () => import('./views/Dashboard.vue') : () => import('./views/Resource.vue') })),
      { path: 'runs/:id', component: () => import('./views/RunDetail.vue'), meta: { title: '执行详情', permission: 'automation.view_testrun' } },
      { path: 'profile', component: () => import('./views/Profile.vue'), meta: { title: '个人设置' } },
    ] },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
router.beforeEach(async to => {
  const auth = useAuth()
  if (to.path === '/login') return true
  if (!sessionStorage.getItem('access')) return '/login'
  if (!auth.user) {
    try { await auth.fetchUser() } catch { return '/login' }
  }
  if (to.meta.permission && !auth.can(String(to.meta.permission))) {
    return '/' + (sections.find(s => auth.can(s.permission))?.path || 'profile')
  }
})
export default router
