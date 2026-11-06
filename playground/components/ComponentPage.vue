<script setup lang="ts">
import { XPage, XPageHeader } from '@novelia/web-kit';
import { useRoute } from 'vue-router';
import CodeBlock from './CodeBlock.vue';

defineProps<{ description: string; code?: string }>();

const route = useRoute();
</script>

<template>
  <XPage>
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
