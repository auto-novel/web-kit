<script setup lang="ts">
import { XSkeleton } from '@novelia/web-kit';
import ComponentPage from './ComponentPage.vue';

const code = `<div class="flex items-center gap-4">
  <XSkeleton class="size-12 rounded-full" />
  <div class="flex-1 space-y-3">
    <XSkeleton class="h-4 w-1/3" />
    <XSkeleton class="h-4 w-2/3" />
  </div>
</div>`;
</script>

<template>
  <ComponentPage
    description="基础骨架占位，通过 class 设置尺寸和形状；跟随系统减少动态效果偏好。"
    :code="code"
  >
    <div class="flex items-center gap-4">
      <XSkeleton class="size-12 rounded-full" />
      <div class="flex-1 space-y-3">
        <XSkeleton class="h-4 w-1/3" />
        <XSkeleton class="h-4 w-2/3" />
      </div>
    </div>
    <XSkeleton class="h-48 w-full" />
  </ComponentPage>
</template>
