<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type Component,
  type TextareaHTMLAttributes,
} from 'vue';

import {
  CodeOutlined,
  FormatBoldOutlined,
  FormatItalicOutlined,
  LinkOutlined,
  StarBorderOutlined,
  StrikethroughSOutlined,
  UnfoldMoreOutlined,
  VisibilityOffOutlined,
} from '@vicons/material';

import XMarkdownContent from './XMarkdownContent.vue';
import XMarkdownEditorToolButton from './XMarkdownEditorToolButton.vue';
import { mergeClasses } from '../classes';
import UTabs from '@nuxt/ui/components/Tabs.vue';
import { handleMarkdownLinkPaste, insertMarkdownText } from './editing';
import type {
  XMarkdownEditorActions,
  XMarkdownEditorProps,
  XMarkdownEditorTool,
} from './types';

// 布局属性作用于外层，其余原生属性和监听器透传给 textarea。
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<XMarkdownEditorProps>(), {
  placeholder: '使用 Markdown 输入内容…',
  rows: 7,
  autosize: true,
  preview: true,
  stickyOffset: 0,
  tools: () => ['bold', 'italic', 'strike', 'code', 'link'],
  ui: () => ({}),
});
const model = defineModel<string>({ default: '' });
defineSlots<{
  toolbar?: (props: XMarkdownEditorActions & { disabled: boolean }) => unknown;
}>();
const activeTab = ref('edit');
const modeItems = computed(() => [
  { label: '编辑', value: 'edit', slot: 'edit' as const },
  ...(props.preview
    ? [{ label: '预览', value: 'preview', slot: 'preview' as const }]
    : []),
]);
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea');
const root = useTemplateRef<HTMLElement>('root');
const sentinel = useTemplateRef<HTMLElement>('sentinel');
const composing = ref(false);
const stuck = ref(false);
const blocked = computed(
  () => props.disabled || props.readonly || composing.value,
);
const stickyOffsetPx = computed(() =>
  Number.isFinite(props.stickyOffset) ? Math.max(0, props.stickyOffset) : 0,
);
const toolbarStyle = computed(() => ({
  '--markdown-editor-toolbar-top': `${stickyOffsetPx.value}px`,
}));
let widthObserver: ResizeObserver | undefined;
let stuckObserver: IntersectionObserver | undefined;

function resize() {
  const element = textarea.value;
  if (!element) return;
  if (!props.autosize) {
    element.style.height = '';
    return;
  }
  if (activeTab.value !== 'edit' || element.closest('[hidden]')) return;
  const view = element.ownerDocument.defaultView;
  const scrollY = view?.scrollY;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
  if (view && scrollY !== undefined && view.scrollY !== scrollY) {
    view.scrollTo({ top: scrollY, behavior: 'instant' });
  }
}

// 吸顶状态只在挂载以及 sticky/stickyOffset 变化时重新解析滚动容器。
function findScrollParent(element: HTMLElement): HTMLElement | null {
  const view = element.ownerDocument.defaultView;
  if (!view?.getComputedStyle) return null;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    if (
      /(auto|scroll|overlay|hidden)/.test(view.getComputedStyle(node).overflowY)
    )
      return node;
  }
  return null;
}

function observeStuck() {
  stuckObserver?.disconnect();
  stuck.value = false;
  if (!props.sticky || typeof IntersectionObserver === 'undefined') return;
  const sentinelElement = sentinel.value;
  const rootElement = root.value;
  if (!sentinelElement || !rootElement) return;
  stuckObserver = new IntersectionObserver(
    ([entry]) => {
      stuck.value =
        !!entry &&
        !entry.isIntersecting &&
        entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
    },
    {
      root: findScrollParent(rootElement),
      rootMargin: `-${stickyOffsetPx.value}px 0px 0px 0px`,
    },
  );
  stuckObserver.observe(sentinelElement);
}

onMounted(() => {
  resize();
  observeStuck();
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    let width = -1;
    widthObserver = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      resize();
    });
    widthObserver.observe(root.value);
  }
});
onBeforeUnmount(() => {
  widthObserver?.disconnect();
  stuckObserver?.disconnect();
});
watch([model, () => props.rows, () => props.autosize], resize, {
  flush: 'post',
});
watch(
  activeTab,
  (tab, _previous, onCleanup) => {
    if (tab !== 'edit') return;
    const view = textarea.value?.ownerDocument.defaultView;
    if (!view) return;
    // Reka Presence 会在 nextTick 后才移除 hidden，等下一帧再测量。
    const frame = view.requestAnimationFrame(resize);
    onCleanup(() => view.cancelAnimationFrame(frame));
  },
  { flush: 'post' },
);
watch([() => props.sticky, stickyOffsetPx], observeStuck, { flush: 'post' });
watch(
  () => props.preview,
  (enabled) => {
    if (!enabled) activeTab.value = 'edit';
  },
);

async function focus(options?: FocusOptions) {
  activeTab.value = 'edit';
  await nextTick();
  textarea.value?.focus(options);
}

async function applySelection(
  prefix: string,
  suffix: string,
  placeholder: string,
  block: boolean,
) {
  if (blocked.value) return false;
  await focus({ preventScroll: true });
  const element = textarea.value;
  if (!element || blocked.value) return false;
  const { selectionStart: start, selectionEnd: end, value } = element;
  const selected = value.slice(start, end) || placeholder;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const leading = block && before && !before.endsWith('\n') ? '\n' : '';
  const trailing = block && after && !after.startsWith('\n') ? '\n' : '';
  const insertion = `${leading}${prefix}${selected}${suffix}${trailing}`;
  if (!insertMarkdownText(element, insertion)) return false;
  await nextTick();
  const selectionStart = start + leading.length + prefix.length;
  element.setSelectionRange(selectionStart, selectionStart + selected.length);
  resize();
  return true;
}
const wrapSelection: XMarkdownEditorActions['wrapSelection'] = (
  prefix,
  suffix,
  placeholder = '',
) => applySelection(prefix, suffix, placeholder, false);
const insertBlock: XMarkdownEditorActions['insertBlock'] = (
  prefix,
  suffix = '',
  placeholder = '',
) => applySelection(prefix, suffix, placeholder, true);

interface ToolDefinition {
  label: string;
  prefix: string;
  suffix: string;
  placeholder: string;
  icon: Component;
  block?: boolean;
}

const toolDefinitions: Record<XMarkdownEditorTool, ToolDefinition> = {
  bold: {
    label: '粗体',
    icon: FormatBoldOutlined,
    prefix: '**',
    suffix: '**',
    placeholder: '粗体',
  },
  italic: {
    label: '斜体',
    icon: FormatItalicOutlined,
    prefix: '*',
    suffix: '*',
    placeholder: '斜体',
  },
  strike: {
    label: '删除线',
    icon: StrikethroughSOutlined,
    prefix: '~~',
    suffix: '~~',
    placeholder: '删除线',
  },
  code: {
    label: '行内代码',
    icon: CodeOutlined,
    prefix: '`',
    suffix: '`',
    placeholder: '行内代码',
  },
  link: {
    label: '链接',
    icon: LinkOutlined,
    prefix: '[',
    suffix: '](https://)',
    placeholder: '链接文字',
  },
  spoiler: {
    label: '剧透',
    icon: VisibilityOffOutlined,
    prefix: '!!',
    suffix: '!!',
    placeholder: '剧透内容',
  },
  star: {
    label: '评分',
    icon: StarBorderOutlined,
    prefix: '::: star 5',
    suffix: '',
    placeholder: '',
    block: true,
  },
  details: {
    label: '折叠内容',
    icon: UnfoldMoreOutlined,
    prefix: '::: details 点击展开\n',
    suffix: '\n:::',
    placeholder: '折叠内容',
    block: true,
  },
};

function insertTool(tool: XMarkdownEditorTool) {
  const { prefix, suffix, placeholder, block } = toolDefinitions[tool];
  return block
    ? insertBlock(prefix, suffix, placeholder)
    : wrapSelection(prefix, suffix, placeholder);
}

function paste(event: ClipboardEvent) {
  if (!blocked.value) handleMarkdownLinkPaste(event, textarea.value);
}

defineExpose({
  textarea,
  focus,
  blur: () => textarea.value?.blur(),
  wrapSelection,
  insertBlock,
});
</script>

<template>
  <div
    ref="root"
    :style="$attrs.style"
    :class="
      mergeClasses(
        '@container/markdown-editor w-full min-w-0 rounded-sm border bg-transparent text-default',
        sticky && 'relative',
        invalid ? 'border-error' : 'border-default',
        ui.root,
        $attrs.class,
      )
    "
  >
    <span
      v-if="sticky"
      ref="sentinel"
      class="pointer-events-none absolute inset-x-0 top-0 h-px"
      aria-hidden="true"
    />
    <UTabs
      v-model="activeTab"
      :items="modeItems"
      :unmount-on-hide="false"
      variant="link"
      :data-stuck="stuck || undefined"
      :style="toolbarStyle"
      :ui="{
        root: 'gap-0 rounded-[inherit]',
        list: mergeClasses(
          'flex-wrap items-stretch rounded-t-[inherit] border-default bg-default p-0',
          sticky && 'sticky top-(--markdown-editor-toolbar-top) z-20',
          stuck && 'shadow-[0_4px_10px_-6px_rgb(0_0_0_/_0.3)]',
          ui.toolbar,
          ui.tabs,
        ),
        trigger: mergeClasses(
          'rounded-none border-r border-default px-4 py-2 text-sm font-semibold data-[state=active]:text-default',
          ui.tab,
        ),
        indicator: 'bg-(--ui-text)',
      }"
    >
      <template #list-trailing>
        <div
          v-if="tools.length || $slots.toolbar"
          role="group"
          aria-label="Markdown 格式工具"
          :inert="activeTab !== 'edit'"
          :aria-hidden="activeTab !== 'edit' || undefined"
          :class="
            mergeClasses(
              'order-last flex w-full flex-wrap items-center gap-0.5 border-t border-default p-1 @md/markdown-editor:order-none @md/markdown-editor:ml-auto @md/markdown-editor:w-auto @md/markdown-editor:border-t-0',
              activeTab !== 'edit' && 'invisible',
              ui.tools,
            )
          "
        >
          <XMarkdownEditorToolButton
            v-for="tool in tools"
            :key="tool"
            :disabled="blocked"
            :label="toolDefinitions[tool].label"
            :icon="toolDefinitions[tool].icon"
            :class="ui.tool"
            @click="insertTool(tool)"
          />
          <span
            v-if="tools.length && $slots.toolbar"
            class="mx-1 h-4 w-px shrink-0 bg-border"
            aria-hidden="true"
          />
          <slot
            name="toolbar"
            :disabled="blocked"
            :wrap-selection="wrapSelection"
            :insert-block="insertBlock"
          />
        </div>
      </template>
      <template #edit>
        <textarea
          ref="textarea"
          v-model="model"
          v-bind="{ ...$attrs, class: undefined, style: undefined }"
          :rows="rows"
          :maxlength="maxlength"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :aria-invalid="
            invalid
              ? true
              : ($attrs[
                  'aria-invalid'
                ] as TextareaHTMLAttributes['aria-invalid'])
          "
          :class="
            mergeClasses(
              'block w-full border-0 bg-transparent p-3 text-sm leading-6 text-default outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
              autosize ? 'resize-none overflow-hidden' : 'resize-y',
              ui.textarea,
            )
          "
          @compositionstart="composing = true"
          @compositionend="composing = false"
          @paste="paste"
        />
      </template>
      <template #preview>
        <!-- 与 textarea 的 rows × leading-6 + 上下 py-3 保持一致。 -->
        <div
          :style="{ '--markdown-editor-min-height': `${rows * 1.5 + 1.5}rem` }"
          :class="
            mergeClasses('min-h-(--markdown-editor-min-height) p-4', ui.preview)
          "
        >
          <XMarkdownContent
            v-if="model.trim()"
            :source="model"
            :markdown="markdown"
          />
          <p v-else class="text-sm text-muted">没有可预览的内容</p>
        </div>
      </template>
    </UTabs>
  </div>
</template>
