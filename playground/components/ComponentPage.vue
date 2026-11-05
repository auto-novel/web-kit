<script setup lang="ts">
import { XPage, XPageHeader } from '@novelia/web-kit';
import { RouterLink, useRoute } from 'vue-router';
import CodeBlock from './CodeBlock.vue';

defineProps<{ description: string; code?: string }>();

const route = useRoute();
</script>

<template>
  <XPage class="pb-6">
    <RouterLink
      to="/components"
      class="mt-6 inline-block text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
    >
      ← 组件总览
    </RouterLink>
    <XPageHeader
      :title="String(route.meta.title ?? '')"
      :description="description"
    />
    <div class="flex flex-col gap-8">
      <slot />
      <section v-if="code" class="border-t border-divider pt-6">
        <h2 class="mb-3 font-medium">基本用法</h2>
        <CodeBlock :code="code" />
      </section>
    </div>
  </XPage>
</template>
