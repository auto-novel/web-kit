<script setup lang="ts">
import {
  WidgetsOutlined,
  HomeOutlined,
  OpenInNewOutlined,
  PaletteOutlined,
  ReportOutlined,
} from '@vicons/material';
import {
  WebKitApp,
  WebKitLayout,
  type WebKitMenuOption,
} from '@novelia/web-kit/shell';
import { useRoute } from 'vue-router';

const route = useRoute();

const navigationOptions: WebKitMenuOption[] = [
  { key: 'home', label: '首页', icon: HomeOutlined, to: '/' },
  { key: 'theme', label: '主题测试', icon: PaletteOutlined, to: '/theme' },
  {
    key: 'nuxt-ui',
    label: 'Nuxt组件',
    icon: PaletteOutlined,
    to: '/nuxt-ui',
  },
  {
    key: 'components',
    label: '扩展组件',
    icon: WidgetsOutlined,
    to: '/components',
  },
  { key: 'divider', type: 'divider' },
  {
    key: 'docs',
    type: 'external',
    label: 'Vite 文档',
    icon: OpenInNewOutlined,
    href: 'https://cn.vite.dev/',
  },
];

const accountOptions: WebKitMenuOption[] = [
  {
    key: 'resources',
    type: 'group',
    label: '相关链接',
    icon: HomeOutlined,
    children: [
      {
        key: 'strikes',
        label: '处罚记录',
        icon: ReportOutlined,
        to: '/strikes',
      },
      {
        key: 'docs-new-tab',
        type: 'external',
        label: 'Vite 文档',
        icon: OpenInNewOutlined,
        href: 'https://cn.vite.dev/',
        target: '_blank',
      },
    ],
  },
];
</script>

<template>
  <WebKitApp>
    <WebKitLayout
      :navigation-options="navigationOptions"
      :account-options="accountOptions"
      :selected-navigation-key="String(route.name ?? '')"
    >
      <template #header-actions>
        <UButton
          to="/theme"
          color="neutral"
          variant="ghost"
          square
          size="md"
          aria-label="主题测试"
          title="主题测试"
        >
          <PaletteOutlined class="size-5" aria-hidden="true" />
        </UButton>
      </template>
      <RouterView />
    </WebKitLayout>
  </WebKitApp>
</template>
