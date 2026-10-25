<script setup lang="ts">
import {
  WidgetsOutlined,
  HomeOutlined,
  OpenInNewOutlined,
  PaletteOutlined,
  PersonOutlined,
  ReportOutlined,
} from '@vicons/material';
import {
  WebKitApp,
  WebKitLayout,
  XButton,
  type WebKitMenuOption,
} from '@novelia/web-kit';
import { RouterLink, useRoute } from 'vue-router';

import { componentPages } from './componentPages';

const route = useRoute();

const inputComponentSlugs = new Set([
  'auto-complete',
  'date-range-picker',
  'drop-zone',
  'input',
  'markdown-editor',
  'number-input',
  'select',
  'slider',
  'switch',
  'textarea',
]);

const componentNavigationGroups: WebKitMenuOption[] = [
  { key: 'input-components', label: '输入组件', input: true },
  { key: 'style-components', label: '样式组件', input: false },
].map(({ key, label, input }) => ({
  key,
  type: 'group',
  label,
  icon: WidgetsOutlined,
  children: componentPages
    .filter(({ slug }) => inputComponentSlugs.has(slug) === input)
    .map(({ name, label, to }) => ({ key: name, label, to })),
}));

const navigationOptions: WebKitMenuOption[] = [
  { key: 'home', label: '首页', icon: HomeOutlined, to: '/' },
  { key: 'theme', label: '主题测试', icon: PaletteOutlined, to: '/theme' },
  {
    key: 'components',
    label: '基础组件总览 Overview',
    icon: WidgetsOutlined,
    to: '/components',
  },
  ...componentNavigationGroups,
  {
    key: 'account',
    type: 'group',
    label: '账号',
    icon: PersonOutlined,
    children: [
      {
        key: 'profile',
        label: '个人资料',
        icon: PersonOutlined,
        to: '/profile',
      },
    ],
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
        <XButton
          :as="RouterLink"
          to="/theme"
          color="neutral"
          variant="ghost"
          size="icon"
          aria-label="主题测试"
          title="主题测试"
        >
          <PaletteOutlined class="size-5" aria-hidden="true" />
        </XButton>
      </template>
      <RouterView />
    </WebKitLayout>
  </WebKitApp>
</template>
