<script setup lang="ts">
import ULink from '@nuxt/ui/components/Link.vue';
import { InfoOutlined } from '@vicons/material';
import type { RouteLocationRaw } from 'vue-router';

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
        <ULink
          v-bind="
            href
              ? { href, target: '_blank', rel: 'noopener noreferrer' }
              : { to }
          "
          class="font-semibold underline underline-offset-2"
        >
          社区守则
        </ULink>
      </span>
    </p>
  </div>
</template>
