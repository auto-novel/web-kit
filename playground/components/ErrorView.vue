<script setup lang="ts">
import { XButton, XError } from '@novelia/web-kit';
import { ref } from 'vue';
import ComponentPage from './ComponentPage.vue';

const retryCount = ref(0);
const code = `<XError description="请求失败，请稍后重试。">
  <XButton @click="reload">再试一次</XButton>
</XError>`;
</script>

<template>
  <ComponentPage
    description="只负责展示错误；状态切换由页面处理，重试等操作通过默认插槽提供。"
    :code="code"
  >
    <XError description="请求失败，请稍后重试。">
      <XButton @click="retryCount++">再试一次</XButton>
    </XError>
    <p class="text-sm text-muted" aria-live="polite">
      已模拟重试 {{ retryCount }} 次，不会发起网络请求。
    </p>
    <XError
      title="回复加载失败"
      description="暂时无法获取回复。"
      class="min-h-0 rounded-sm border border-border p-6"
    />
  </ComponentPage>
</template>
