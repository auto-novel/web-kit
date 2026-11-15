<script setup lang="ts">
import { CheckOutlined, KeyboardArrowDownOutlined } from '@vicons/material';
import { computed } from 'vue';

import UButton from '@nuxt/ui/components/Button.vue';
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue';

const props = defineProps<{
  current: 'auth' | 'forum' | 'auto-novel';
}>();

const sites = [
  { key: 'auth', label: 'Auth', href: 'https://auth.novelia.cc/admin/' },
  { key: 'forum', label: 'Forum', href: 'https://forum.novelia.cc/admin/' },
  {
    key: 'auto-novel',
    label: 'AutoNovel',
    href: 'https://n.novelia.cc/admin/',
  },
] as const;

const currentLabel = computed(
  () => sites.find((site) => site.key === props.current)!.label,
);
const menuContent = {
  side: 'bottom' as const,
  'aria-label': '管理后台切换',
};
const items = computed(() =>
  sites.map((site) => ({
    ...site,
    disabled: site.key === props.current,
    'aria-current': site.key === props.current ? ('page' as const) : undefined,
  })),
);
</script>

<template>
  <UDropdownMenu :items="items" :external-icon="false" :content="menuContent">
    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      size="md"
      class="group min-h-9 gap-1 px-3"
      :aria-label="`切换管理后台，当前 ${currentLabel}`"
    >
      <span>{{ currentLabel }}</span>
      <KeyboardArrowDownOutlined
        class="size-4 flex-none transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </UButton>
    <template #item-trailing="{ item }">
      <CheckOutlined
        v-if="item.key === props.current"
        class="size-4 flex-none"
        aria-hidden="true"
      />
    </template>
  </UDropdownMenu>
</template>
