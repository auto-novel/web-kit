# 样式定制

## 基本用法

- 用 `class` / `style` 调整组件整体外观，用 `ui` 调整组件提供的样式分区。
- 同一节点上，冲突的 Tailwind 工具类按 **默认样式 → `ui` → `class`** 的顺序覆盖，后者优先。
- `ui` 分区值支持字符串、数组和条件对象；可用分区由对应的 `X…Ui` 类型提示。
- 响应式和状态修饰符需要分别覆盖。例如 `px-2` 不会覆盖 `sm:px-6`，需要写成 `px-2 sm:px-2`。
- 自定义 CSS 类遵循 CSS 层叠规则，不保证后传入的类优先。
- 插槽内容由使用者自行设置样式，`ui` 不会修改插槽内的元素。

Nuxt UI 组件使用其自身的 `class` / `ui` API，分区以对应组件文档为准。

## 组件分区

| 组件                      | `class` / `style` 作用位置         | `ui` 分区                                                                             |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| XPage                     | 页面容器                           | aside                                                                                 |
| XTime                     | time 元素                          | 无                                                                                    |
| XDateRangePicker          | 输入框外层                         | root、trigger、clear、content、header、navigation、day                                |
| XConfirmDialog            | 浮层内容；建议用 `ui.content` 定制 | content、overlay、title、description、actions、cancel、confirm                        |
| XDropZone                 | 全屏拖放遮罩                       | overlay、content、icon、description                                                   |
| XPagination               | 分页导航                           | root、list、prev、next、item、ellipsis、jumpContent、jumpLabel、jumpInput、jumpButton |
| XMarkdownEditor           | 编辑器外层                         | root、toolbar、tabs、tab、tools、tool、textarea、preview                              |
| XMarkdownContent          | 正文容器                           | 无；排版使用下述 CSS 变量                                                             |
| XMarkdownEditorToolButton | 工具按钮                           | 无                                                                                    |

`XDateRangePicker` 固定使用默认 40px 字段高度，不提供 `size`；需要调整时使用 `class` / `ui.root`。其其他原生属性和事件作用于触发按钮；`XMarkdownEditor` 的其他原生属性和事件作用于 textarea。例如编辑区内边距用 `ui.textarea`，而不是组件的 `class`。

`XMarkdownEditor` 的 `toolbar` 和 `tabs` 都作用于顶部标签栏；`tools` 是格式工具区，`tool` 是内置工具按钮。

## 示例

```vue
<script setup lang="ts">
import {
  XDateRangePicker,
  XMarkdownEditor,
  type XDateRange,
  type XMarkdownEditorUi,
} from '@novelia/web-kit';
import { ref } from 'vue';

const range = ref<XDateRange | null>(null);
const text = ref('');
const editorUi = {
  textarea: 'px-4 py-4 leading-7',
  preview: ['p-4', { 'bg-primary/10': true }],
} satisfies XMarkdownEditorUi;
</script>

<template>
  <!-- class 覆盖外层宽度，ui.content 调整日历浮层。 -->
  <XDateRangePicker
    v-model="range"
    class="w-80"
    :ui="{ content: 'rounded-lg p-4' }"
  />

  <XMarkdownEditor v-model="text" class="rounded-lg" :ui="editorUi" />
</template>
```

## Markdown 正文排版

在 `XMarkdownContent` 的 `style` 或父级 CSS 中设置以下变量；编辑器预览也可通过父级继承：

- 字号与行高：`--markdown-font-size`、`--markdown-line-height`。
- 标题与段落间距：`--markdown-heading-margin`、`--markdown-block-margin`。
- 标题滚动定位偏移：`--markdown-scroll-margin`。
- 星级颜色：`--markdown-star-color`、`--markdown-star-active-color`。
- 剧透背景与展开文字颜色：`--markdown-spoiler-background`、`--markdown-spoiler-color`。

```vue
<XMarkdownContent
  :source="text"
  style="--markdown-font-size: 1rem; --markdown-line-height: 1.8"
/>
```
