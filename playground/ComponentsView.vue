<script setup lang="ts">
import {
  LoadingBar,
  Toast,
  XConfirmDialog,
  XDateRangePicker,
  XDropZone,
  XMarkdownContent,
  XMarkdownEditor,
  XPage,
  XPagination,
  XTime,
  createMarkdown,
  useMarkdownDraft,
  type LoadingBarTask,
  type ToastId,
  type ToastOptions,
  type XDateRange,
} from '@novelia/web-kit';
import { onBeforeUnmount, ref, shallowRef } from 'vue';

const range = ref<XDateRange | null>(['2026-06-01', '2026-06-07']);
const exampleRange: XDateRange = ['2026-06-01', '2026-06-07'];
const dropDisabled = ref(false);
const files = shallowRef<File[]>([]);
const markdown = createMarkdown().disable(['image']);
const source = ref(
  '## 旅途中的书店\n\n这是一个 **Markdown** 示例，支持 *斜体*、~~删除线~~ 与 `代码`。\n\n!!藏在书页里的秘密!!\n\n::: details 阅读更多\n雨后的街角，一家书店亮着灯。\n:::\n\n::: star 4.5',
);
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
const confirmOpen = ref(false);
const page = ref(2);
const showAside = ref(false);
const sampleTime = new Date('2025-06-05T15:04:30+08:00');
const relativeBase = new Date('2025-06-05T15:07:30+08:00');
const loadingTasks = shallowRef<LoadingBarTask[]>([]);
function startLoadingTask() {
  loadingTasks.value = [...loadingTasks.value, LoadingBar.start()];
}
function finishLoadingTask(fail = false) {
  const [task, ...remaining] = loadingTasks.value;
  if (!task) return;
  loadingTasks.value = remaining;
  if (fail) task.error();
  else task.finish();
}
function runQuickPromise() {
  void LoadingBar.promise(Promise.resolve());
}
const ownedIds = new Set<ToastId>();
const editableId = ref<ToastId>();
const pending = ref(false);
let finishOperation: ((fail: boolean) => void) | undefined;

function track(options: ToastOptions = {}): ToastOptions {
  const id = options.id ?? `playground-${Date.now()}-${++sequence}`;
  ownedIds.add(id);
  return {
    ...options,
    id,
    onRemove: () => {
      ownedIds.delete(id);
      options.onRemove?.();
    },
  };
}
let sequence = 0;
function showEditable() {
  const options = track({
    duration: 0,
    onClose: () => {
      editableId.value = undefined;
    },
  });
  editableId.value = Toast.info('等待处理的常驻通知', options);
}
function startOperation() {
  if (pending.value) return;
  pending.value = true;
  const operation = new Promise<string>((resolve, reject) => {
    finishOperation = (fail) => {
      finishOperation = undefined;
      if (fail) reject(new Error('保存失败，请稍后重试'));
      else resolve('设置已保存');
    };
  });
  void Toast.promise(
    operation,
    {
      loading: '正在保存…',
      success: (value) => value,
      error: '保存失败，请稍后重试',
    },
    track(),
  )
    .catch(() => {})
    .finally(() => {
      pending.value = false;
    });
}
onBeforeUnmount(() => {
  for (const task of loadingTasks.value) task.finish();
  loadingTasks.value = [];
  finishOperation?.(false);
  for (const id of ownedIds) Toast.dismiss(id);
});
function confirm() {
  confirmOpen.value = false;
  Toast.success('示例操作完成', track());
}
const menuItems = [
  { label: '编辑', onSelect: () => Toast.info('已选择编辑', track()) },
  { label: '暂不可用', disabled: true },
  {
    label: '删除示例',
    color: 'error' as const,
    onSelect: () => {
      confirmOpen.value = true;
    },
  },
];
</script>

<template>
  <XPage>
    <UPageHeader title="扩展组件" />

    <div class="min-w-0 divide-y divide-default">
      <section
        id="date-range-picker"
        aria-labelledby="date-range-title"
        class="scroll-mt-20 py-8 first:pt-0"
      >
        <h2 id="date-range-title" class="heading-bar mb-4 text-lg font-medium">
          日期区间 · XDateRangePicker
        </h2>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <h3 class="text-sm text-muted">可清空</h3>
            <XDateRangePicker
              v-model="range"
              min="2026-01-01"
              max="2026-12-31"
              clearable
              aria-label="日期区间"
            />
            <p class="text-xs text-muted" aria-live="polite">
              {{ range ? range.join(' 至 ') : '未选择' }}
            </p>
          </div>
          <div class="space-y-2">
            <h3 class="text-sm text-muted">禁用</h3>
            <XDateRangePicker
              :model-value="exampleRange"
              disabled
              aria-label="禁用日期区间"
            />
          </div>
          <div class="space-y-2">
            <h3 class="text-sm text-muted">只读</h3>
            <XDateRangePicker
              :model-value="exampleRange"
              readonly
              aria-label="只读日期区间"
            />
          </div>
        </div>
      </section>

      <section
        id="drop-zone"
        aria-labelledby="drop-zone-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="drop-zone-title" class="heading-bar mb-4 text-lg font-medium">
          文件拖放 · XDropZone
        </h2>
        <XDropZone :disabled="dropDisabled" @drop="files = $event">
          松开以接收文件（不会上传）
        </XDropZone>
        <USwitch v-model="dropDisabled" label="禁用文件拖放" />
        <div
          class="mt-4 border-y border-dashed border-default py-8 text-center text-sm text-muted"
          aria-live="polite"
        >
          <ul v-if="files.length" class="space-y-2">
            <li v-for="(file, index) in files" :key="index" class="break-all">
              {{ file.name }} · {{ file.size }} 字节
            </li>
          </ul>
          <p v-else>将系统文件拖入窗口 · 仅展示，不上传</p>
        </div>
      </section>

      <section
        id="markdown-editor"
        aria-labelledby="markdown-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="markdown-title" class="heading-bar mb-4 text-lg font-medium">
          Markdown · XMarkdownEditor / XMarkdownContent
        </h2>
        <USwitch v-model="sticky" label="工具栏吸顶" class="mb-4" />
        <div class="grid min-w-0 gap-6 lg:grid-cols-2">
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">编辑与预览</h3>
            <XMarkdownEditor
              v-model="source"
              :markdown="markdown"
              :rows="6"
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
              aria-label="Markdown 正文"
            />
            <p class="text-xs text-muted">{{ source.length }} / 2000</p>
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">内容渲染</h3>
            <XMarkdownContent :source="source" :markdown="markdown" />
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">禁用</h3>
            <XMarkdownEditor
              model-value="禁用状态的编辑器。"
              disabled
              :rows="3"
              aria-label="禁用编辑器"
            />
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">只读</h3>
            <XMarkdownEditor
              model-value="只读内容仍可选择和复制。"
              readonly
              :rows="3"
              aria-label="只读编辑器"
            />
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">固定高度</h3>
            <XMarkdownEditor
              :autosize="false"
              :rows="3"
              :tools="['bold', 'link']"
              aria-label="固定高度编辑器"
              placeholder="写下你的想法…"
            />
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">校验错误</h3>
            <XMarkdownEditor
              invalid
              :preview="false"
              :rows="3"
              :tools="[]"
              aria-label="错误编辑器"
              aria-describedby="markdown-error"
            />
            <p id="markdown-error" class="text-xs text-error">正文不能为空</p>
          </div>
        </div>
        <div class="mt-6 space-y-3">
          <h3 class="text-sm font-medium">本地草稿</h3>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="target in ['one', 'two']"
              :key="target"
              color="neutral"
              :variant="draftTarget === target ? 'solid' : 'outline'"
              size="sm"
              @click="draftTarget = target"
            >
              场景 {{ target }}
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              @click="clearDraft()"
            >
              丢弃草稿
            </UButton>
          </div>
          <p v-if="draftRestored" role="status" class="text-xs text-muted">
            已恢复本地草稿
          </p>
          <XMarkdownEditor
            v-model="draftSource"
            :rows="3"
            aria-label="本地草稿"
          />
        </div>
      </section>

      <section
        id="confirm-dialog"
        aria-labelledby="confirm-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="confirm-title" class="heading-bar mb-4 text-lg font-medium">
          确认框 · XConfirmDialog
        </h2>
        <div class="flex flex-wrap gap-3">
          <UButton color="error" @click="confirmOpen = true">删除示例</UButton>
          <UDropdownMenu :items="menuItems">
            <UButton color="neutral" variant="outline">更多操作</UButton>
          </UDropdownMenu>
        </div>
        <XConfirmDialog
          v-model:open="confirmOpen"
          title="删除示例"
          description="此操作仅展示确认流程，不会删除实际数据。"
          confirm-label="确认删除"
          danger
          @confirm="confirm"
        />
      </section>

      <section
        id="pagination"
        aria-labelledby="pagination-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="pagination-title" class="heading-bar mb-4 text-lg font-medium">
          分页 · XPagination
        </h2>
        <XPagination v-model:page="page" :total-pages="20" keyboard />
        <p class="mt-3 text-xs text-muted" aria-live="polite">
          当前页：{{ page }} / 20
        </p>
      </section>

      <section
        id="loading-bar"
        aria-labelledby="loading-bar-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="loading-bar-title" class="heading-bar mb-4 text-lg font-medium">
          顶部加载条 · LoadingBar
        </h2>
        <p class="mb-4 text-sm text-muted">
          可多次开始任务，所有任务结束后收起加载条。
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton @click="startLoadingTask">开始任务</UButton>
          <UButton
            color="success"
            variant="outline"
            :disabled="!loadingTasks.length"
            @click="finishLoadingTask()"
          >
            完成一个
          </UButton>
          <UButton
            color="error"
            variant="outline"
            :disabled="!loadingTasks.length"
            @click="finishLoadingTask(true)"
          >
            失败一个
          </UButton>
        </div>
        <p class="mt-3 text-xs text-muted" aria-live="polite">
          待处理：{{ loadingTasks.length }}
        </p>
        <div class="mt-4 space-y-2">
          <UButton color="neutral" variant="outline" @click="runQuickPromise">
            快速 Promise
          </UButton>
          <p class="text-xs text-muted">
            立即完成的 Promise 不显示加载条，避免闪烁。
          </p>
        </div>
      </section>

      <section
        id="toast"
        aria-labelledby="toast-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="toast-title" class="heading-bar mb-4 text-lg font-medium">
          通知 · Toast
        </h2>
        <div class="flex flex-wrap gap-3">
          <UButton
            color="success"
            @click="Toast.success('操作成功，设置已保存', track())"
          >
            成功
          </UButton>
          <UButton
            color="error"
            @click="Toast.error('操作失败，请稍后重试', track())"
          >
            错误
          </UButton>
          <UButton
            color="info"
            variant="soft"
            @click="Toast.info('有新的内容可供查看', track())"
          >
            信息
          </UButton>
          <UButton
            color="warning"
            variant="soft"
            @click="Toast.warning('继续操作前请检查配置', track())"
          >
            警告
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            @click="Toast.success('导入完成\n成功：24 条\n跳过：2 条', track())"
          >
            多行通知
          </UButton>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="!!editableId"
            @click="showEditable"
          >
            常驻通知
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            :disabled="!editableId"
            @click="
              editableId &&
              Toast.update(editableId, {
                message: '处理完成',
                status: 'success',
                duration: 3000,
              })
            "
          >
            更新为成功
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="!editableId"
            @click="editableId && Toast.dismiss(editableId)"
          >
            关闭此条
          </UButton>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <UButton :disabled="pending" @click="startOperation">
            模拟请求
          </UButton>
          <UButton
            color="success"
            variant="outline"
            :disabled="!pending"
            @click="finishOperation?.(false)"
          >
            模拟成功
          </UButton>
          <UButton
            color="error"
            variant="outline"
            :disabled="!pending"
            @click="finishOperation?.(true)"
          >
            模拟失败
          </UButton>
        </div>
      </section>

      <section id="time" aria-labelledby="time-title" class="scroll-mt-20 py-8">
        <h2 id="time-title" class="heading-bar mb-4 text-lg font-medium">
          时间 · XTime
        </h2>
        <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt class="text-muted">默认</dt>
          <dd><XTime :time="sampleTime" /></dd>
          <dt class="text-muted">日期</dt>
          <dd><XTime :time="sampleTime" preset="date" /></dd>
          <dt class="text-muted">数字日期时间</dt>
          <dd><XTime :time="sampleTime" preset="datetime-numeric" /></dd>
          <dt class="text-muted">自定义格式</dt>
          <dd><XTime :time="sampleTime" format="yyyy/M/d HH:mm:ss" /></dd>
          <dt class="text-muted">相对时间</dt>
          <dd>
            <XTime :time="sampleTime" preset="relative" :to="relativeBase" />
          </dd>
        </dl>
      </section>

      <section
        id="page"
        aria-labelledby="page-title"
        class="scroll-mt-20 py-8 last:pb-0"
      >
        <h2 id="page-title" class="heading-bar mb-4 text-lg font-medium">
          页面 · XPage
        </h2>
        <USwitch v-model="showAside" label="显示侧栏" />
        <XPage
          class="mt-4 px-0 sm:px-0"
          :ui="{ aside: 'static h-48 w-28 ps-3 sm:w-48' }"
        >
          <h3 class="mb-3 font-medium">阅读空间</h3>
          <p class="text-sm leading-7 text-muted">
            清晨的列车沿着河流前进，窗外的田野渐渐被山林取代。她在书页间夹好车票，开始读下一章。
          </p>
          <template v-if="showAside" #aside>
            <h3 class="mb-3 text-sm font-medium">章节目录</h3>
            <UScrollArea class="min-h-0 flex-1">
              <ul class="space-y-3 text-sm text-muted">
                <li v-for="index in 20" :key="index">第 {{ index }} 章</li>
              </ul>
            </UScrollArea>
          </template>
        </XPage>
      </section>
    </div>
  </XPage>
</template>
