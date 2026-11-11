<script setup lang="ts">
import {
  XButton,
  XMarkdownEditor,
  createMarkdown,
  useMarkdownDraft,
} from '@novelia/web-kit/ui';
import { ref, useTemplateRef } from 'vue';
import ComponentPage from './ComponentPage.vue';

// 实际项目在模块级创建一次并共享；playground 只有一个视图实例。
const markdown = createMarkdown().disable(['image']);
const source = ref(
  '## 共享 Markdown\n\n选中文字后点击格式按钮，也可以粘贴一个网址。\n\n!!点击查看剧透!!\n\n::: details 点击展开\n折叠内容\n:::\n\n::: star 4.5',
);
const editor = useTemplateRef('editor');
const sticky = ref(false);
const draftTarget = ref('one');
const {
  text: draftSource,
  restored: draftRestored,
  clear: clearDraft,
} = useMarkdownDraft({
  key: () => `playground:comment:${draftTarget.value}`,
  initialValue: '@示例用户 ',
  maxAge: 3 * 24 * 60 * 60 * 1000,
});
const code = `// 模块级创建一次并共享
const markdown = createMarkdown().disable(['image']);
// markdown.use(...) 可继续挂载子网站插件

<XMarkdownEditor
  v-model="source"
  :markdown="markdown"
  :tools="['bold', 'italic', 'strike', 'code', 'link', 'spoiler', 'star', 'details']"
  aria-label="正文"
  sticky
  :sticky-offset="50"
/>

import { useMarkdownDraft } from '@novelia/web-kit/ui';

// key 由业务组合应用、账号、资源、回复对象；undefined 则不保存。
const { text: comment, restored, clear, prepareSubmission } = useMarkdownDraft({
  key: () => draftKey.value,
  initialValue: '@示例用户 ',
});
<XMarkdownEditor v-model="comment" />
// restored / clear 可由业务在编辑器外展示恢复状态和丢弃入口。

// 请求前捕获快照，只在成功后完成；失败时保留草稿。
const finish = prepareSubmission();
await publishComment(comment.value);
finish(); // 不清除请求期间的新输入；返回是否清空当前正文`;
</script>

<template>
  <ComponentPage
    description="内置安全预览，支持自定义解析器与工具栏扩展。"
    :code="code"
  >
    <section class="space-y-3 border-t border-divider pt-6">
      <h2 class="font-medium">选区编辑、预览和工具栏扩展</h2>
      <p class="text-sm text-muted">
        预览使用调用方传入的解析器，净化仍由共享组件完成，支持剧透、半星评分和折叠内容。选中文字后粘贴
        HTTP(S) 地址可转换成链接。
      </p>
      <div class="flex flex-wrap items-center gap-4">
        <XButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="editor?.focus()"
        >
          聚焦编辑器
        </XButton>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="sticky" type="checkbox" />
          工具栏吸顶（50px 偏移）
        </label>
      </div>
      <label for="markdown-source" class="block text-sm font-medium">
        正文
      </label>
      <XMarkdownEditor
        id="markdown-source"
        ref="editor"
        v-model="source"
        :markdown="markdown"
        name="content"
        :rows="5"
        :maxlength="2000"
        :tools="[
          'bold',
          'italic',
          'strike',
          'code',
          'link',
          'spoiler',
          'star',
          'details',
        ]"
        :sticky="sticky"
        :sticky-offset="50"
        aria-describedby="markdown-hint"
      />
      <p id="markdown-hint" class="text-xs text-muted">
        {{ source.length }} / 2000；按钮插入同样遵守
        maxlength，中文组合输入时禁用格式操作。
      </p>
    </section>
    <section class="space-y-3 border-t border-divider pt-6">
      <h2 class="font-medium">可选的本地文本草稿</h2>
      <p class="text-sm text-muted">
        由业务独立调用 useMarkdownDraft，并将返回的 text 通过 v-model
        绑定编辑器。输入后切换场景或刷新页面会恢复，初始提及不会自动保存。
        草稿只保存在当前站点的浏览器，不会上传服务器；恢复状态和丢弃入口均由业务按需提供。
      </p>
      <div class="flex flex-wrap gap-2">
        <XButton
          v-for="target in ['one', 'two']"
          :key="target"
          color="neutral"
          :variant="draftTarget === target ? 'solid' : 'outline'"
          size="sm"
          @click="draftTarget = target"
        >
          场景 {{ target }}
        </XButton>
        <XButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="clearDraft()"
        >
          丢弃当前草稿
        </XButton>
      </div>
      <p v-if="draftRestored" role="status" class="text-sm text-muted">
        已恢复当前场景的本地草稿
      </p>
      <XMarkdownEditor v-model="draftSource" :rows="3" aria-label="草稿示例" />
    </section>
    <section class="space-y-3 border-t border-divider pt-6">
      <h2 class="font-medium">禁用、只读和固定高度</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <XMarkdownEditor
          model-value="禁用期间不能编辑或插入格式。"
          disabled
          :rows="3"
          aria-label="禁用示例"
        />
        <XMarkdownEditor
          model-value="只读内容仍可选择和复制。"
          readonly
          :rows="3"
          aria-label="只读示例"
        />
        <XMarkdownEditor
          :autosize="false"
          :rows="3"
          :tools="['bold', 'link']"
          aria-label="手动调整高度"
          placeholder="关闭 autosize 后可手动调整高度"
        />
        <div>
          <XMarkdownEditor
            invalid
            :preview="false"
            :rows="3"
            :tools="[]"
            aria-label="错误示例"
            aria-describedby="markdown-error"
          />
          <p id="markdown-error" class="mt-1 text-xs text-error">
            示例校验错误；preview=false 时只显示编辑标签。
          </p>
        </div>
      </div>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">接口约定</h2>
      <p class="text-sm leading-6 text-muted">
        v-model 绑定字符串。autosize 默认开启，rows 为最小高度；sticky
        默认关闭，stickyOffset 单位为
        px，取决于外部滚动容器，吸顶后工具栏显示轻阴影。tools 选择内置
        按钮，默认启用 bold、italic、strike、code、link；spoiler、star、details
        按需加入 tools。toolbar 插槽提供
        disabled、wrapSelection、insertBlock；插入方法返回
        Promise&lt;boolean&gt;。预览默认开启，设置 preview=false
        可隐藏，空内容显示统一提示。解析器由调用方通过 createMarkdown
        创建（可继续 use 子网站插件），以 markdown
        属性传入；不传时使用共享默认实例。组件始终负责净化，不内置业务模式。排版与扩展配色可通过
        --markdown-* CSS 变量覆盖。class/style
        用于外层；其余原生属性与事件透传到 textarea。ui 可覆盖
        root、toolbar、tabs、tab、tools、tool、textarea、preview。组件引用提供
        textarea、focus、blur
        和两种插入方法。支持的浏览器优先使用原生编辑命令保留撤销；格式按钮在不支持时退回选区替换，粘贴转换则退回原生粘贴。
      </p>
      <p class="mt-3 text-sm leading-6 text-muted">
        useMarkdownDraft 独立管理 localStorage 文本草稿，编辑器仅通过 v-model
        绑定返回的 text。key 为 undefined 时不读写草稿存储；切换 key
        会恢复对应正文，无稿时使用 initialValue（默认空串）。maxAge
        单位为毫秒，默认不过期，本站最多保留 20 份草稿。组合式函数还返回
        restored、clear 和
        prepareSubmission；业务可在编辑器外按需展示恢复状态、丢弃草稿。
        prepareSubmission 返回仅在请求成功后调用的清理回调，
        返回是否安全清空当前正文。业务应在 key
        中包含账号以隔离不同用户的草稿；退出账号不会自动删除已保存的草稿。
        存储不可用时仅保留内存副本；草稿整表保存在一个存储项中，通过 storage
        事件同步，不覆盖正在编辑的正文。草稿尽力保存；跨标签页同时保存可能互相覆盖，不保证并发一致性。
        多字段帖子表单应自行管理整体草稿，不要同时开启独立的正文草稿。
      </p>
    </section>
  </ComponentPage>
</template>
