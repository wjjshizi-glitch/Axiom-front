<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { all, api } from '../api'
import { useAuth } from '../stores/auth'
const props = defineProps<{ open: boolean; project: number; caseIds?: number[]; suite?: number }>()
const emit = defineEmits(['close'])
const envs = ref<any[]>([]), environment = ref<number>(), name = ref(''), loading = ref(false)
const router = useRouter(), auth = useAuth()
watch(() => props.open, async value => {
  if (value) { envs.value = await all('/environments/'); environment.value = envs.value.find(e => e.id === auth.user?.current_environment)?.id || envs.value[0]?.id }
})
async function run() {
  loading.value = true
  try {
    const { data } = await api.post('/runs/', { project:props.project, environment:environment.value, name:name.value, case_ids:props.caseIds, suite:props.suite })
    emit('close'); router.push('/runs/' + data.id)
  } finally { loading.value = false }
}
</script>
<template>
  <el-dialog :model-value="open" title="执行测试" width="480px" @close="emit('close')">
    <el-form label-position="top">
      <el-form-item label="执行名称"><el-input v-model="name" placeholder="选填，默认使用项目名称"/></el-form-item>
      <el-form-item label="测试环境" required><el-select v-model="environment" placeholder="请选择环境" style="width:100%"><el-option v-for="env in envs" :key="env.id" :label="env.name" :value="env.id"/></el-select></el-form-item>
    </el-form>
    <p class="muted">将按用例顺序执行，执行结果与日志会实时更新。</p>
    <template #footer><el-button @click="emit('close')">取消</el-button><el-button type="primary" :loading="loading" :disabled="!environment" @click="run">开始执行</el-button></template>
  </el-dialog>
</template>
