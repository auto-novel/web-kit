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
| XProgressCircle           | 环形进度容器                       | root、svg、track、segment、label、shimmer                                             |
| XImageCompare             | 图片对比容器                       | root、before、after、afterImage、beforeLabel、afterLabel、divider、handle、input      |
| XDateRangePicker          | 输入框外层                         | root、trigger、clear、content、header、navigation、day                                |
| XConfirmDialog            | 浮层内容；建议用 `ui.content` 定制 | content、overlay、title、description、actions、cancel、confirm                        |
| XDropZone                 | 全屏拖放遮罩                       | overlay、content、icon、description                                                   |
| XPagination               | 分页导航                           | root、list、prev、next、item、ellipsis、jumpContent、jumpLabel、jumpInput、jumpButton |
| XMarkdownEditor           | 编辑器外层                         | root、toolbar、tabs、tab、tools、tool、textarea、preview                              |
| XMarkdownContent          | 正文容器                           | 无；排版使用下述 CSS 变量                                                             |
| XMarkdownEditorToolButton | 工具按钮                           | 无                                                                                    |

`XDateRangePicker` 固定使用默认 40px 字段高度，不提供 `size`；需要调整时使用 `class` / `ui.root`。其其他原生属性和事件作用于触发按钮；`XMarkdownEditor` 的其他原生属性和事件作用于 textarea。例如编辑区内边距用 `ui.textarea`，而不是组件的 `class`。

`XMarkdownEditor` 的 `toolbar` 和 `tabs` 都作用于顶部标签栏；`tools` 是格式工具区，`tool` 是内置工具按钮。

## 环形进度

`XProgressCircle` 的 `running` 在已填充分段上播放透明度呼吸动画，减少动态效果时停用动画。`ui.segment` 和 `ui.shimmer` 作用于同一 SVG 分段，后者仅在运行时生效；不再使用独立遮罩。`ui.label` 可覆盖默认字号和字重。

## 图片对比

`XImageCompare` 的 `before` / `after` / `alt` 对应两张图片和描述；默认标签为“对比前 / 对比后”，压缩场景可设 `before-label="压缩前" after-label="压缩后"`。左侧显示 before，右侧显示 after，`v-model` 是 0–100 的分界百分比（初始 50）；图片 URL 改变时保留位置，不发出更新事件；如需重置，由调用方更新绑定值。`label` 设置原生 range 的无障碍名称，`disabled` 禁用操作。

默认原图参与布局，不放大小图，after 铺满同一矩形；用 `ui.before` 设置弹窗所需的最大高度，例如 `max-h-[calc(85vh-4rem)]`。`aspect` 接受有限正数，切换为全宽固定比例容器，两图使用 cover 裁切；admin 横幅预览可传 `aspect`，并在外层限制 `max-width: calc(520px * 宽高比)`、用 `class="overflow-hidden rounded-lg"` 保留原有尺寸和圆角。共享层不内置弹窗或 admin 的高度限制。

`before-label`、`after-label` 和 `handle` 插槽均提供 `position`；这些插槽是装饰内容，不应包含交互控件。

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
