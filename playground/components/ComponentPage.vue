<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import CodeBlock from './CodeBlock.vue';

defineProps<{ description: string; code?: string }>();

const route = useRoute();
</script>

<template>
  <div class="page-container flex flex-col gap-8 py-6">
    <header class="border-b border-divider pb-6">
      <RouterLink
        to="/components"
        class="mb-4 inline-block text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
      >
        ← 组件总览
      </RouterLink>
      <h1 class="mb-2 text-lg font-medium">{{ route.meta.title }}</h1>
      <p class="text-sm leading-6 text-muted">{{ description }}</p>
    </header>
    <slot />
    <section v-if="code" class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">基本用法</h2>
      <CodeBlock :code="code" />
    </section>
  </div>
</template>
