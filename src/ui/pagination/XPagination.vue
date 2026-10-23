<script setup lang="ts">
import {
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui';
import {
  nextTick,
  ref,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';

import XButton from '../button/XButton.vue';
import { mergeClasses } from '../classes';
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

const keyboardEnabled = () =>
  props.keyboard === true && openJumpIndex.value === null;

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
    event.shiftKey
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

  // 只有分页获得焦点时才接管方向键；边界页也阻止滚动，保持行为一致。
  event.preventDefault();

  const element = rootElement();
  const rtl =
    element !== null &&
    element.ownerDocument.defaultView?.getComputedStyle(element).direction ===
      'rtl';
  const nextPage =
    page + (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
  if (nextPage < 1 || nextPage > totalPages) return;

  pendingKeyboardPage = nextPage;
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
  element.querySelector<HTMLElement>('[data-pagination-summary]')?.focus();
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
        :class="mergeClasses(ui.prev)"
      >
        上一页
      </XButton>
    </PaginationPrev>

    <PageJump
      :open="openJumpIndex === -1"
      :page="page"
      :total-pages="totalPages"
      :ui="{
        content: mergeClasses('sm:hidden', ui.jumpContent),
        label: ui.jumpLabel,
        input: ui.jumpInput,
        button: ui.jumpButton,
      }"
      @update:open="setJumpOpen($event, -1)"
      @change="$emit('update:page', $event)"
    >
      <XButton
        color="neutral"
        variant="ghost"
        size="sm"
        data-pagination-summary
        :class="mergeClasses('text-xs text-muted sm:hidden', ui.summary)"
        :disabled="totalPages < 1"
        :aria-label="`当前第 ${page} 页，共 ${totalPages} 页，跳转到指定页`"
        title="跳转到指定页"
      >
        {{ page }} / {{ totalPages }}
      </XButton>
    </PageJump>
    <PaginationList
      v-slot="{ items }"
      :class="mergeClasses('hidden items-center gap-1 sm:flex', ui.list)"
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
                'text-xs font-medium data-selected:bg-primary data-selected:text-on-primary data-selected:hover:bg-primary-hover data-selected:hover:text-on-primary',
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
        :class="mergeClasses(ui.next)"
      >
        下一页
      </XButton>
    </PaginationNext>
  </PaginationRoot>
</template>
