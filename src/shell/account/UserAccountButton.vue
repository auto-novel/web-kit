<script setup lang="ts">
import UButton from '@nuxt/ui/components/Button.vue';
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue';
import type { DropdownMenuItem } from '@nuxt/ui';
import {
  ExitToAppOutlined,
  GavelOutlined,
  KeyboardArrowDownOutlined,
} from '@vicons/material';
import { computed, ref, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import { useWebKit, useWebKitInternals } from '../../context';
import type { WebKitMenuOption } from '../../types';
import XTime from '../../ui/time/XTime.vue';
import { externalLinkAttrs } from '../menu/helpers';
import LoginDialog from './LoginDialog.vue';

const props = defineProps<{ options: WebKitMenuOption[] }>();

const { logout: signOut, whoami } = useWebKit();
const { attention, options: kitOptions, session } = useWebKitInternals();
const accountTrigger = ref<{ $el: HTMLButtonElement }>();
const menuOpen = ref(false);
const loginOpen = ref(false);
const hasUnreadStrikes = computed(
  () =>
    kitOptions.strikes.enabled &&
    attention.status.value?.strikes.hasUnread === true,
);
const accountLabel = computed(() => {
  const user = whoami.value.user;
  if (!user) return '登录/注册';
  const attention = hasUnreadStrikes.value ? '，有新的处罚记录' : '';
  return `账号 @${user.username}${attention}`;
});

// 仅转换业务菜单数据，渲染、子菜单与交互交给 Nuxt UI。
function menuItems(options: WebKitMenuOption[]): DropdownMenuItem[] {
  return options.map((option) => {
    if (option.type === 'divider') return { type: 'separator' };
    const item = { label: option.label, menuIcon: option.icon };
    if (option.type === 'group')
      return {
        ...item,
        children: menuItems(option.children),
        disabled: !option.children.length,
      };
    if (option.type === 'external')
      return { ...item, ...externalLinkAttrs(option), external: true };
    return { ...item, to: option.to };
  });
}

const items = computed(() => {
  const groups: DropdownMenuItem[][] = [
    [
      {
        label: `${whoami.value.roleLabel}${whoami.value.asAdmin ? '+' : ''}`,
        slot: 'account',
        type: whoami.value.isAdmin ? 'checkbox' : 'label',
        checked: whoami.value.asAdmin,
        ui: {
          itemLabel: 'text-sm font-medium text-ink',
          itemDescription: 'mt-0.5 text-xs font-normal',
          itemTrailing: 'hidden',
        },
        onUpdateChecked: () => session.toggleAdminMode(),
        onSelect: (event) => event.preventDefault(),
      },
    ],
    menuItems(props.options),
    [
      ...(kitOptions.strikes.enabled
        ? [
            {
              label: '处罚记录',
              menuIcon: GavelOutlined,
              to: kitOptions.strikes.to as RouteLocationRaw,
              slot: 'strikes',
              'aria-label': hasUnreadStrikes.value
                ? '处罚记录，有新的处罚记录'
                : '处罚记录',
            },
          ]
        : []),
      { label: '退出账号', menuIcon: ExitToAppOutlined, onSelect: logout },
    ],
  ];
  return groups.filter((group) => group.length > 0);
});

watch(menuOpen, (open) => {
  if (open) void attention.refresh();
});

async function logout() {
  menuOpen.value = false;
  try {
    await signOut();
  } catch {
    // The auth session clears the local session even if the remote session has expired.
  }
}

function restoreAccountFocus(event: Event) {
  // 避免 sticky 页头中的触发器回焦时滚动文档。
  event.preventDefault();
  accountTrigger.value?.$el.focus({ preventScroll: true });
}
</script>

<template>
  <div class="relative ml-auto min-w-0 flex-none">
    <UDropdownMenu
      v-if="whoami.isSignedIn"
      v-model:open="menuOpen"
      :items="items"
      :content="{ align: 'end', onCloseAutoFocus: restoreAccountFocus }"
      :ui="{ content: 'w-48', item: 'items-center' }"
    >
      <template #default="{ open }">
        <UButton
          ref="accountTrigger"
          color="neutral"
          variant="ghost"
          class="font-normal"
          :aria-label="accountLabel"
        >
          <span class="max-w-24 truncate sm:max-w-48">
            @{{ whoami.user?.username }}
          </span>
          <span
            v-if="hasUnreadStrikes"
            class="size-1.5 shrink-0 rounded-full bg-error"
            aria-hidden="true"
          />
          <KeyboardArrowDownOutlined
            class="size-4 shrink-0 transition-transform motion-reduce:transition-none"
            :class="{ 'rotate-180': open }"
            aria-hidden="true"
          />
        </UButton>
      </template>
      <template #item-leading="{ item, active, ui }">
        <component
          :is="item.menuIcon"
          v-if="item.menuIcon"
          :class="ui.itemLeadingIcon({ active, class: 'size-4' })"
          style="color: inherit"
          aria-hidden="true"
        />
      </template>
      <template #account-description>
        注册于
        <XTime :time="whoami.user?.createdAt" preset="date" />
      </template>
      <template #strikes-leading="{ active, ui }">
        <GavelOutlined
          :class="ui.itemLeadingIcon({ active, class: 'size-4' })"
          style="color: inherit"
          aria-hidden="true"
        />
      </template>
      <template #strikes-trailing>
        <span
          v-if="hasUnreadStrikes"
          class="text-xs text-error"
          aria-hidden="true"
        >
          新
        </span>
      </template>
    </UDropdownMenu>
    <UButton
      v-else
      color="neutral"
      variant="ghost"
      class="font-normal"
      @click="loginOpen = true"
    >
      登录/注册
    </UButton>
  </div>

  <LoginDialog v-model:open="loginOpen" />
</template>
