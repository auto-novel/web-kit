<script setup lang="ts">
import { ChevronLeftOutlined, ChevronRightOutlined } from '@vicons/material';
import { useEventListener } from '@vueuse/core';
import {
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui';
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  ref,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue';

import XButton from '../button/XButton.vue';
import { mergeClasses } from '../classes';
import {
  hasPaginationOverlay,
  ignoresPaginationKeyboard,
  paginationKeyBoundary,
} from './keyboard';
import PageJump from './PageJump.vue';
import type { XPaginationProps } from './types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XPaginationProps>(), { ui: () => ({}) });

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const root = useTemplateRef<{ $el: HTMLElement }>('root');
const attrs = useAttrs();

const active = ref(true);
let pendingKeyboardPage: number | null = null;

onActivated(() => (active.value = true));
onDeactivated(() => {
  active.value = false;
  pendingKeyboardPage = null;
});

const keyboardTarget = computed<EventTarget | null>(() => {
  if (!active.value) return null;
  const keyboard = props.keyboard;
  if (keyboard === 'window')
    return rootElement()?.ownerDocument.defaultView ?? null;
  if (keyboard && typeof keyboard === 'object') return keyboard;
  return keyboard === true ? rootElement() : null;
});

useEventListener<KeyboardEvent>(keyboardTarget, 'keydown', handleKeydown);

// Reka 根组件的内部 props 与已移除的旧键盘入口不作为透传属性。
const reservedAttrs = new Set([
  'as',
  'aschild',
  'defaultpage',
  'disabled',
  'itemsperpage',
  'keyboardglobal',
  'keyboardscope',
  'siblingcount',
  'showedges',
  'total',
]);
function rootAttrs() {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'class' &&
      !reservedAttrs.has(key.replace(/-/g, '').toLowerCase())
    )
      result[key] = value;
  }
  return result;
}

const navButtonClass = 'w-8 px-0 text-ink hover:text-primary sm:w-auto sm:px-3';
const pageItemClass =
  'text-xs font-medium text-ink hover:text-primary data-selected:bg-primary-soft data-selected:text-primary-text data-selected:hover:bg-primary-soft-hover data-selected:hover:text-primary';

type PaginationItem = { type: 'page'; value: number } | { type: 'ellipsis' };

function itemKey(item: PaginationItem, index: number) {
  return item.type === 'page' ? `page-${item.value}` : `ellipsis-${index}`;
}

function rootElement() {
  return root.value?.$el ?? null;
}

function handleKeydown(event: KeyboardEvent) {
  if (
    (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
    event.repeat ||
    !active.value ||
    !props.keyboard ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;

  const element = rootElement();
  if (!element) return;

  const boundary = paginationKeyBoundary(event, element);
  if (ignoresPaginationKeyboard(event, boundary)) return;

  const document = element.ownerDocument;
  const selection = document.getSelection();
  if (
    (selection && !selection.isCollapsed) ||
    hasPaginationOverlay(document, boundary)
  )
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

watch(
  () => props.page,
  (page) => {
    if (pendingKeyboardPage !== page) return;
    pendingKeyboardPage = null;

    const element = rootElement();
    if (!element) return;
    const focused = element.ownerDocument.activeElement;
    if (focused && element.contains(focused) && !focused.matches(':disabled'))
      return;

    const current = element.querySelector<HTMLElement>(
      '[data-type="page"][aria-current="page"]',
    );
    if (current && current.getClientRects().length > 0) current.focus();
  },
  { flush: 'post' },
);
</script>

<template>
  <PaginationRoot
    ref="root"
    aria-label="分页"
    v-bind="rootAttrs()"
    :page="page"
    :total="totalPages"
    :items-per-page="1"
    :sibling-count="1"
    show-edges
    :class="
      mergeClasses(
        'flex items-center justify-between border-t border-divider px-4 py-3 text-sm sm:px-6',
        ui.root,
        attrs.class,
      )
    "
    @update:page="$emit('update:page', $event)"
  >
    <PaginationPrev as-child>
      <XButton
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="上一页"
        :class="mergeClasses(navButtonClass, ui.prev)"
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
      <template v-for="(item, index) in items" :key="itemKey(item, index)">
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          as-child
        >
          <XButton
            color="neutral"
            variant="ghost"
            size="icon-sm"
            :class="mergeClasses(pageItemClass, ui.item)"
          >
            {{ item.value }}
          </XButton>
        </PaginationListItem>
        <PageJump
          v-else
          :page="page"
          :total-pages="totalPages"
          :ui="{
            content: ui.jumpContent,
            label: ui.jumpLabel,
            input: ui.jumpInput,
            button: ui.jumpButton,
          }"
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
        :class="mergeClasses(navButtonClass, ui.next)"
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
