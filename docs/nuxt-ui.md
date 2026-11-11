# Nuxt UI 接入与通用组件迁移

web-kit 的通用控件已直接迁移到 Nuxt UI 4.12，不再导出已迁移的 `X*` 通用组件或兼容别名。
`@nuxt/ui` 现在是必需的 peer dependency；消费应用必须同步更新接入。

```sh
pnpm add @nuxt/ui@^4.12.0 @iconify-json/lucide
```

## Vue / Vite

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { defineConfig } from 'vite';
import { webKitNuxtUiOptions } from '@novelia/web-kit/nuxt-ui';

export default defineConfig({
  plugins: [vue(), ui(webKitNuxtUiOptions)],
});
```

Nuxt UI 插件已包含 Tailwind 插件，不要重复注册 `@tailwindcss/vite`。
预设关闭组件/composable 自动导入及声明文件生成，使用显式导入。

```css
/* styles.css 已包含 Nuxt UI、共享主题和保留组件的样式。 */
@import 'tailwindcss';
@import '@novelia/web-kit/styles.css';
```

原 `@novelia/web-kit/nuxt-ui.css` 是完整样式入口的别名，只导入其中一个。

```ts
// main.ts，保留既有 router / createWebKit 安装。
import ui from '@nuxt/ui/vue-plugin';
app.use(ui);
```

`WebKitApp` 内部已经提供中文 `UApp`（含 Tooltip 和 Nuxt Toast 的 provider），不要重复包裹：

```vue
<script setup lang="ts">
import { WebKitApp } from '@novelia/web-kit';
import UButton from '@nuxt/ui/components/Button.vue';
</script>

<template>
  <WebKitApp>
    <UButton>直接使用 Nuxt UI</UButton>
    <RouterView />
  </WebKitApp>
</template>
```

应用挂载容器添加 `class="isolate"`。若不使用 `WebKitApp`，宿主自行提供 `UApp`。
TypeScript 添加生成主题的路径映射（相对于宿主 tsconfig；首次运行 Vite 后生成）：

```json
{
  "compilerOptions": {
    "paths": {
      "#build/ui": ["./node_modules/.nuxt-ui/ui"],
      "#build/ui/*": ["./node_modules/.nuxt-ui/ui/*"]
    }
  }
}
```

## 已删除的通用组件

| 旧组件                                                   | 直接使用                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| XButton / XInput / XTextarea                             | UButton / UInput / UTextarea                               |
| XNumberInput / XSelect / XAutoComplete                   | UInputNumber / USelect / UInputMenu（mode="autocomplete"） |
| XSwitch / XSkeleton / XSeparator / XTooltip              | USwitch / USkeleton / USeparator / UTooltip                |
| XTabs、XTabsList、XTabsTrigger、XTabsContent             | UTabs items + 内容插槽                                     |
| XDropdownMenu、XDropdownMenuItem、XDropdownMenuSeparator | UDropdownMenu items / 分组                                 |
| XEmpty / XError                                          | UEmpty / UAlert；整页错误可用 UError                       |
| XFilePicker                                              | UFileUpload，关闭 dropzone / preview，使用 open 插槽       |
| XPageHeader                                              | UPageHeader（原 actions 插槽改为 links）                   |

旧组件专属 Props、Ui、Option 类型以及 XColor、XVariant 均删除，使用 Nuxt 对应类型。
按钮 `danger` 改为 `error`，图标按钮使用 `square` + `size`，链接直接使用 `to`。
输入清空用 trailing 插槽；文本域统计用简单 DOM；输入错误使用 UFormField 或 color="error" + highlight。

第二阶段也已删除 XDialog、XDrawer 及其专属类型，分别直接使用 UModal、USlideover（拖拽面板可选 UDrawer）。
保留 XConfirmDialog、XPagination、XDateRangePicker、XDropZone、XPage、XTime、Markdown、Toast，以及认证、论坛、站点布局业务。

XSlider 已删除，后续滑块直接使用 USlider；不再保留通用刻度、非均匀吸附和 null 未设置语义的扩展。

## 滚动与鼠标拖动

XScrollArea 及其 Props / Ui 已删除，普通滚动直接使用 UScrollArea 和浏览器原生滚动条。
不再提供滚动条 type、隐藏延迟或 scrollbar / thumb / corner 分区；双轴容器用原生 `overflow-auto`。

鼠标按住内容拖动以独立 composable 提供，可用于 UScrollArea 或任意实际滚动元素：

```vue
<script setup lang="ts">
import UScrollArea from '@nuxt/ui/components/ScrollArea.vue';
import { useDragScroll } from '@novelia/web-kit/utils';
import { useTemplateRef } from 'vue';

const area = useTemplateRef<{ $el: HTMLElement }>('area');
useDragScroll(() => area.value?.$el, {
  orientation: 'horizontal',
  inertia: true,
});
</script>

<template>
  <UScrollArea ref="area" orientation="horizontal" class="cursor-grab">
    <!-- 横向内容 -->
  </UScrollArea>
</template>
```

- 默认 enabled=true、orientation='vertical'、inertia=false；选项支持 ref / getter 动态更新。
- 自动绑定并清理事件，返回只读 `dragging` 与 `stop()`；停止时还原临时的 cursor / user-select。
- 保留 5px 拖动阈值、拖动后点击抑制、惯性衰减及输入中断；降低动态效果偏好时不开启惯性。
- 不拦截按钮、链接、输入框等交互控件；额外排除区域可添加 `data-drag-scroll-ignore`。
- 不接管触屏、触控板、滚轮或键盘滚动，也不提供自绘滚动条。

## 弹窗与抽屉

- UModal / USlideover 的默认插槽是触发器，不是正文；正文放 `#body`，自定义完整面板放 `#content`。
- 原 `#trigger` 内容移到默认插槽，`#footer` 保留；原无触发器的受控弹窗只传 `v-model:open` 与命名插槽。
- `closable` 改用 `dismissible` 与 `close`；提交中两者均设 false，业务操作继续防止重复提交。
- `fullScreen` 改为 `fullscreen`；面板宽高通过 `ui.content` 配置。提供触发器时根 `class` 作用于触发器，不要用它指定面板尺寸。
- 站点移动导航直接用 USlideover 的 `#content`，保留 title 作为无障碍名称，不再加一层抽屉包装。
- XConfirmDialog 仅组合 UModal / UButton：默认聚焦取消、loading 禁止关闭、confirm 仅通知、成功由父组件关闭。
- 删除旧鼠标原点动画、回焦 helper 和自建 z-index 栈，统一使用 Nuxt / Reka 的 body portal、焦点管理及滚动锁；根容器必须保留 `isolate`。
- 普通浮层不再指定固定 z-index；通知固定 100、全局文件拖入遮罩固定 200。保留的日历与跳页浮层也遵循 portal DOM 顺序。
- 通过原生触发器打开的弹层使用 Nuxt 默认回焦；无触发器且需回到指定外部元素时，在调用处用 `content.onCloseAutoFocus` 明确指定。
- Nuxt 原生弹窗/抽屉动画保留，降低动态效果偏好下禁用动画；阅读器专有键盘/视口需求应在阅读器调用处处理。

## 主题约定

- 通过 `webKitNuxtUiOptions.ui` 统一 Nuxt UI 外观，不包装通用组件。
- 语义色、文字、背景和边框引用现有 token；小圆角和默认 40px 字段高度保持一致。
- 关闭 Nuxt UI `colorMode`，由 `useWebKit().theme` / `data-theme` 统一驱动明暗和阅读器临时覆盖。
- `secondary` 暂映射主色；需要灰色值本身时用 `bg-(--color-muted)`，不要混淆 Nuxt 的 `bg-muted` 表面语义。
- Playground `/#/nuxt-ui` 只保留一页代表性主题示例；保留组件仍有自己的示例。
- 不再提供全局 `menu-item`、`floating-panel-motion` 及对应关键帧；账号菜单直接使用 UDropdownMenu（含原生子菜单与动画），日期浮层不再使用自建动画。下游自绘菜单改用 Nuxt UI，或在调用处显式设置样式；例如 auto-novel 的搜索历史按钮不能再依赖 `menu-item`。

本次是破坏性升级。auto-novel、forum 等消费仓库未自动修改；未迁移的宿主应固定旧版本。
