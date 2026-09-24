<script setup lang="ts">
defineProps<{ value: string }>()
const labels: Record<string,string> = { passed:'通过', failed:'失败', error:'异常', queued:'排队中', running:'执行中', cancelled:'已取消' }
</script>
<template><span class="status-badge" :class="value"><i></i>{{ labels[value] || value }}</span></template>
