<script setup lang="ts">
import { InfoOutlined } from '@vicons/material';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

// 论坛内使用路由，其他站点传入论坛守则的外链。
defineProps<
  { to: RouteLocationRaw; href?: never } | { href: string; to?: never }
>();
</script>

<template>
  <div
    class="flex items-center gap-2 rounded-md border border-primary/15 bg-primary/10 px-3 py-2 text-sm text-default"
  >
    <InfoOutlined class="size-4 shrink-0 text-primary" aria-hidden="true" />
    <p class="flex flex-wrap">
      <span>发言请遵守</span>
      <span class="inline-flex">
        <component
          :is="href ? 'a' : RouterLink"
          v-bind="
            href
              ? { href, target: '_blank', rel: 'noopener noreferrer' }
              : { to }
          "
          class="font-semibold text-primary underline underline-offset-2 hover:text-primary/75 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          社区守则
        </component>
      </span>
    </p>
  </div>
</template>
