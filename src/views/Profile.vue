<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api, clearSession } from '../api'
import { useAuth } from '../stores/auth'
const auth = useAuth(), router = useRouter()
const profile = reactive({display_name:auth.user?.display_name || '',email:auth.user?.email || ''})
const password = reactive({old_password:'',new_password:''})
async function save() { await api.patch('/auth/me/', profile); await auth.fetchUser(); ElMessage.success('个人信息已保存') }
async function changePassword() {
  await api.post('/auth/password/', password); clearSession(); auth.user = null
  ElMessage.success('密码已更新，请重新登录'); router.push('/login')
}
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">ACCOUNT</div><h1>个人设置</h1><p>管理你的个人资料和登录密码</p></div></div>
  <div class="profile-grid">
    <section class="panel profile-panel"><h3>基本资料</h3><el-form label-position="top"><el-form-item label="用户名"><el-input :model-value="auth.user?.username" disabled/></el-form-item><el-form-item label="显示名称"><el-input v-model="profile.display_name"/></el-form-item><el-form-item label="邮箱"><el-input v-model="profile.email"/></el-form-item><el-button type="primary" @click="save">保存资料</el-button></el-form></section>
    <section class="panel profile-panel"><h3>修改密码</h3><el-form label-position="top"><el-form-item label="当前密码"><el-input v-model="password.old_password" type="password" show-password autocomplete="current-password"/></el-form-item><el-form-item label="新密码"><el-input v-model="password.new_password" type="password" show-password autocomplete="new-password"/></el-form-item><p class="muted">至少 8 位，不能为纯数字或常见密码。</p><el-button type="primary" @click="changePassword">更新密码</el-button></el-form></section>
  </div>
</template>
