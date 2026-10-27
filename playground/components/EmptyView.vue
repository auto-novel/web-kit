<script setup lang="ts">
import { XButton, XEmpty } from '@novelia/web-kit';
import ComponentPage from './ComponentPage.vue';

const code = `<XEmpty title="暂无收藏" description="收藏喜欢的作品后，会显示在这里。" />

<XEmpty size="compact" title="没有搜索结果" description="试试其他关键词。">
  <template #icon><span class="text-2xl">?</span></template>
  <XButton>重新搜索</XButton>
</XEmpty>`;
</script>

<template>
  <ComponentPage
    description="独立空状态，支持标题、描述、三种尺寸及图标和操作内容插槽。"
    :code="code"
  >
    <XEmpty title="暂无收藏" description="收藏喜欢的作品后，会显示在这里。" />
    <XEmpty
      size="compact"
      title="没有搜索结果"
      description="试试其他关键词。"
      class="rounded-sm border border-border"
    >
      <template #icon><span class="text-2xl">?</span></template>
      <XButton>重新搜索</XButton>
    </XEmpty>
  </ComponentPage>
</template>
