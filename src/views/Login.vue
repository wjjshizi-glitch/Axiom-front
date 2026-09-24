<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Command, ArrowRight, Check, Terminal, ShieldCheck } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
const username = ref(''), password = ref(''), loading = ref(false)
const auth = useAuth(), router = useRouter()
async function submit() {
  if (!username.value || !password.value) return
  loading.value = true
  try { await auth.login(username.value, password.value); router.push('/') }
  finally { loading.value = false }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story"><div class="brand light"><span class="brand-symbol"><Command :size="24"/></span>axiom.</div>
      <div class="story-content"><span class="eyebrow">BUILD CONFIDENCE. SHIP BETTER.</span><h1>让测试有序，<br/>让质量可见。</h1><p>从接口调试到自动化回归，<br/>连接团队与每一次可靠的交付。</p>
        <div class="terminal-card"><div class="terminal-top"><i></i><i></i><i></i><span>axiom / test-runner</span></div><div><span class="terminal-prompt">$</span> axiom run --suite smoke</div><p><Check :size="14"/> 环境配置已加载</p><p><Check :size="14"/> 测试用例准备就绪</p><p><Check :size="14"/> 让每一个结果都有据可查</p><div class="terminal-line">Ready for your next release<span class="cursor">_</span></div></div>
      </div><div class="story-footer"><ShieldCheck :size="16"/> 安全授权 · 环境隔离 · 全程可追溯</div>
    </section>
    <section class="login-form-wrap"><div class="login-form"><span class="login-kicker">WELCOME TO AXIOM</span><h2>欢迎回来</h2><p class="muted">登录你的测试工作空间</p>
      <form @submit.prevent="submit"><label for="username">账号</label><el-input id="username" v-model="username" placeholder="请输入用户名" size="large" autocomplete="username"/><label for="password">密码</label><el-input id="password" v-model="password" type="password" show-password placeholder="请输入密码" size="large" autocomplete="current-password"/><el-button class="login-submit" type="primary" size="large" native-type="submit" :loading="loading">登录工作空间 <ArrowRight :size="17"/></el-button></form>
      <div class="login-note"><Terminal :size="16"/> 首次使用请由管理员创建账号</div>
    </div><div class="login-copyright">Axiom API Automation Platform · 2026</div></section>
  </div>
</template>
