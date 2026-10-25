<script setup lang="ts">
import { ChevronLeftOutlined, ChevronRightOutlined } from '@vicons/material';
import {
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui';
import {
  nextTick,
  onActivated,
  onDeactivated,
  ref,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';

import XButton from '../button/XButton.vue';
import { mergeClasses } from '../classes';
import { hasPaginationOverlay, ignoresPaginationKeyboard } from './keyboard';
import PageJump from './PageJump.vue';
import type { XPaginationProps } from './types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XPaginationProps>(), { ui: () => ({}) });

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const root = useTemplateRef<ComponentPublicInstance>('root');
const openJumpIndex = ref<number | null>(null);
let pendingKeyboardPage: number | null = null;

const active = ref(true);
onActivated(() => (active.value = true));
onDeactivated(() => (active.value = false));

const keyboardEnabled = () =>
  active.value && props.keyboard === true && openJumpIndex.value === null;

watch(
  () => (keyboardEnabled() ? props.keyboardScope : null),
  (scope, _, onCleanup) => {
    if (!scope) return;
    scope.addEventListener('keydown', handleKeydown);
    onCleanup(() => scope.removeEventListener('keydown', handleKeydown));
  },
  { flush: 'post', immediate: true },
);

function rootElement() {
  return (root.value?.$el ?? null) as HTMLElement | null;
}

function handleKeydown(event: KeyboardEvent) {
  if (
    (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
    event.repeat ||
    !keyboardEnabled() ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    ignoresPaginationKeyboard(event)
  )
    return;

  const element = rootElement();
  if (!element) return;
  const document = element.ownerDocument;
  const selection = document.getSelection();
  if ((selection && !selection.isCollapsed) || hasPaginationOverlay(document))
    return;

  const { page, totalPages } = props;
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(totalPages) ||
    page < 1 ||
    page > totalPages
  )
    return;

  const rtl =
    document.defaultView?.getComputedStyle(element).direction === 'rtl';
  const nextPage =
    page + (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
  if (nextPage < 1 || nextPage > totalPages) return;

  event.preventDefault();
  // 列表内翻页不抢焦点；仅分页自身触发时恢复可能失效的按钮焦点。
  if (event.composedPath().includes(element)) pendingKeyboardPage = nextPage;
  emit('update:page', nextPage);
  void nextTick(() => {
    // 父组件没有接受翻页时，避免影响之后无关的页码变化。
    if (pendingKeyboardPage !== null) pendingKeyboardPage = null;
  });
}

function restoreKeyboardFocus(page: number) {
  if (pendingKeyboardPage !== page) return;
  pendingKeyboardPage = null;

  const element = rootElement();
  if (!element) return;
  const active = element.ownerDocument.activeElement;
  if (active && element.contains(active) && !active.matches(':disabled'))
    return;

  const current = element.querySelector<HTMLElement>(
    '[data-type="page"][aria-current="page"]',
  );
  if (current && current.getClientRects().length > 0) {
    current.focus();
    return;
  }
}

watch(() => props.page, restoreKeyboardFocus, { flush: 'post' });

function setJumpOpen(open: boolean, index: number) {
  if (open) openJumpIndex.value = index;
  else if (openJumpIndex.value === index) openJumpIndex.value = null;
}

watch([() => props.page, () => props.totalPages], () => {
  openJumpIndex.value = null;
});
</script>

<template>
  <PaginationRoot
    ref="root"
    aria-label="分页"
    v-bind="{ ...$attrs, class: undefined }"
    :page="page"
    :total="totalPages"
    :items-per-page="1"
    :sibling-count="1"
    show-edges
    :class="
      mergeClasses(
        'flex items-center justify-between border-t border-divider px-4 py-3 text-sm sm:px-6',
        ui.root,
        $attrs.class,
      )
    "
    @keydown="handleKeydown"
    @update:page="$emit('update:page', $event)"
  >
    <PaginationPrev as-child>
      <XButton
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="上一页"
        :class="
          mergeClasses(
            'w-8 px-0 text-ink hover:text-primary sm:w-auto sm:px-3',
            ui.prev,
          )
        "
      >
        <ChevronLeftOutlined
          class="size-5 sm:hidden rtl:rotate-180"
          aria-hidden="true"
        />
        <span class="hidden sm:inline">上一页</span>
      </XButton>
    </PaginationPrev>

    <PaginationList
      v-slot="{ items }"
      :class="mergeClasses('flex items-center gap-1', ui.list)"
    >
      <template v-for="(item, index) in items" :key="index">
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          as-child
        >
          <XButton
            color="neutral"
            variant="ghost"
            size="icon-sm"
            :class="
              mergeClasses(
                'text-xs font-medium text-ink hover:text-primary data-selected:bg-primary-soft data-selected:text-primary-text data-selected:hover:bg-primary-soft-hover data-selected:hover:text-primary',
                ui.item,
              )
            "
          >
            {{ item.value }}
          </XButton>
        </PaginationListItem>
        <PageJump
          v-else
          :open="openJumpIndex === index"
          :page="page"
          :total-pages="totalPages"
          :ui="{
            content: ui.jumpContent,
            label: ui.jumpLabel,
            input: ui.jumpInput,
            button: ui.jumpButton,
          }"
          @update:open="setJumpOpen($event, index)"
          @change="$emit('update:page', $event)"
        >
          <XButton
            color="neutral"
            variant="ghost"
            size="icon-sm"
            :class="mergeClasses('text-xs text-muted', ui.ellipsis)"
            aria-label="跳转到指定页"
            title="跳转到指定页"
          >
            …
          </XButton>
        </PageJump>
      </template>
    </PaginationList>

    <PaginationNext as-child>
      <XButton
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="下一页"
        :class="
          mergeClasses(
            'w-8 px-0 text-ink hover:text-primary sm:w-auto sm:px-3',
            ui.next,
          )
        "
      >
        <ChevronRightOutlined
          class="size-5 sm:hidden rtl:rotate-180"
          aria-hidden="true"
        />
        <span class="hidden sm:inline">下一页</span>
      </XButton>
    </PaginationNext>
  </PaginationRoot>
</template>
