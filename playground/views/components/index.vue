<script setup lang="ts">
import {
  LoadingBar,
  Toast,
  XConfirmDialog,
  XDateRangePicker,
  XDropZone,
  XPage,
  XPagination,
  XTime,
  type LoadingBarTask,
  type ToastId,
  type ToastOptions,
  type XDateRange,
} from '@novelia/web-kit';
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import ExampleControls from '../../components/ExampleControls.vue';
import MarkdownExample from './MarkdownExample.vue';
import MediaExample from './MediaExample.vue';
import ProgressCircleExample from './ProgressCircleExample.vue';

const range = ref<XDateRange | null>(['2026-06-01', '2026-06-07']);
const exampleRange: XDateRange = ['2026-06-01', '2026-06-07'];
const dateDisabled = ref(false);
const dateOptions = ref(['clearable']);
const dropDisabled = ref(false);
const files = shallowRef<File[]>([]);
const confirmOpen = ref(false);
const page = ref(2);
const paginationOptions = ref(['keyboard']);
const pageOptions = ref<string[]>([]);
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
    <UPageHeader
      title="扩展组件"
      description="基于 Nuxt UI 的业务扩展，覆盖日期筛选、内容编辑、操作反馈与页面布局；通过控制区切换状态，对照常见用法。"
    />

    <div class="min-w-0 divide-y divide-default">
      <MediaExample />
      <section aria-labelledby="input-files-title" class="py-8 first:pt-0">
        <h2 id="input-files-title" class="heading-bar mb-4 text-lg font-medium">
          输入与文件
        </h2>
        <div class="space-y-8">
          <div
            role="group"
            id="date-range-picker"
            aria-labelledby="date-range-title"
            class="min-w-0 scroll-mt-20"
          >
            <h3 id="date-range-title" class="mb-3 text-sm font-medium">
              日期区间 · XDateRangePicker
            </h3>
            <p class="mb-4 text-sm text-muted">
              选择完整区间后更新值，示例限制在 2026 年内。
            </p>
            <ExampleControls
              v-model:disabled="dateDisabled"
              v-model:options="dateOptions"
              :controls="['disabled']"
              :extra-options="[
                { label: '可清空', value: 'clearable' },
                { label: '只读', value: 'readonly' },
                { label: '校验错误', value: 'invalid' },
              ]"
              class="mb-6"
            />
            <div class="grid gap-6 md:grid-cols-2">
              <div class="min-w-0 space-y-3">
                <h4 class="text-sm font-medium">交互示例 · min / max</h4>
                <XDateRangePicker
                  v-model="range"
                  min="2026-01-01"
                  max="2026-12-31"
                  :clearable="dateOptions.includes('clearable')"
                  :disabled="dateDisabled"
                  :readonly="dateOptions.includes('readonly')"
                  :invalid="dateOptions.includes('invalid')"
                  :aria-describedby="
                    dateOptions.includes('invalid')
                      ? 'date-range-error'
                      : undefined
                  "
                  aria-label="日期区间"
                />
                <p
                  v-if="dateOptions.includes('invalid')"
                  id="date-range-error"
                  class="text-xs text-error"
                >
                  示例校验错误：请选择有效日期区间
                </p>
                <p class="text-xs text-muted" aria-live="polite">
                  {{ range ? range.join(' 至 ') : '未选择' }}
                </p>
              </div>
              <div class="min-w-0 space-y-3">
                <h4 class="text-sm font-medium">
                  状态对照 · disabled / readonly
                </h4>
                <XDateRangePicker
                  :model-value="exampleRange"
                  disabled
                  aria-label="禁用日期区间"
                />
                <XDateRangePicker
                  :model-value="exampleRange"
                  readonly
                  aria-label="只读日期区间"
                />
              </div>
            </div>
          </div>

          <div
            role="group"
            id="drop-zone"
            aria-labelledby="drop-zone-title"
            class="min-w-0 scroll-mt-20"
          >
            <h3 id="drop-zone-title" class="mb-3 text-sm font-medium">
              文件拖放 · XDropZone
            </h3>
            <XDropZone :disabled="dropDisabled" @drop="files = $event">
              松开以接收文件（不会上传）
            </XDropZone>
            <ExampleControls
              v-model:disabled="dropDisabled"
              :controls="['disabled']"
              class="mb-4"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="!files.length"
                @click="files = []"
              >
                清空文件列表
              </UButton>
            </ExampleControls>
            <div
              class="mt-4 border-y border-dashed border-default py-8 text-center text-sm text-muted"
              aria-live="polite"
            >
              <ul v-if="files.length" class="space-y-2">
                <li
                  v-for="(file, index) in files"
                  :key="index"
                  class="break-all"
                >
                  {{ file.name }} · {{ file.size }} 字节
                </li>
              </ul>
              <p v-else>
                {{
                  dropDisabled
                    ? '文件拖放已禁用'
                    : '将系统文件拖入窗口 · 仅展示，不上传'
                }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarkdownExample />

      <section
        id="time"
        aria-labelledby="display-title"
        class="scroll-mt-20 py-8"
      >
        <h2 id="display-title" class="heading-bar mb-4 text-lg font-medium">
          信息展示
        </h2>
        <h3 id="time-title" class="mb-3 text-sm font-medium">时间 · XTime</h3>
        <p class="mb-4 text-sm text-muted">
          同一时间的不同格式；相对时间使用固定参照，便于对照。
        </p>
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
        <ProgressCircleExample class="mt-8" />
      </section>

      <section aria-labelledby="actions-feedback-title" class="py-8">
        <h2
          id="actions-feedback-title"
          class="heading-bar mb-4 text-lg font-medium"
        >
          操作与反馈
        </h2>
        <div class="grid min-w-0 gap-8 lg:grid-cols-2">
          <div class="min-w-0 space-y-8">
            <div
              role="group"
              id="confirm-dialog"
              aria-labelledby="confirm-title"
              class="min-w-0 scroll-mt-20"
            >
              <h3 id="confirm-title" class="mb-3 text-sm font-medium">
                确认框 · XConfirmDialog
              </h3>
              <p class="mb-4 text-sm text-muted">
                独立按钮与菜单共用确认流程，默认聚焦取消按钮。示例不删除实际数据。
              </p>
              <div class="flex flex-wrap gap-3">
                <UButton color="error" @click="confirmOpen = true">
                  删除示例
                </UButton>
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
            </div>

            <div
              role="group"
              id="loading-bar"
              aria-labelledby="loading-bar-title"
              class="min-w-0 scroll-mt-20"
            >
              <h3 id="loading-bar-title" class="mb-3 text-sm font-medium">
                顶部加载条 · LoadingBar
              </h3>
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
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="runQuickPromise"
                >
                  快速 Promise
                </UButton>
                <p class="text-xs text-muted">
                  立即完成的 Promise 不显示加载条，避免闪烁。
                </p>
              </div>
            </div>
          </div>

          <div
            role="group"
            id="toast"
            aria-labelledby="toast-title"
            class="min-w-0 scroll-mt-20"
          >
            <h3 id="toast-title" class="mb-3 text-sm font-medium">
              通知 · Toast
            </h3>
            <h4 class="mb-3 text-sm font-medium">语义状态与多行内容</h4>
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
                @click="
                  Toast.success('导入完成\n成功：24 条\n跳过：2 条', track())
                "
              >
                多行通知
              </UButton>
            </div>
            <h4 class="mt-6 mb-3 text-sm font-medium">常驻通知 · 更新与关闭</h4>
            <div class="flex flex-wrap gap-3">
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
            <h4 class="mt-6 mb-3 text-sm font-medium">
              异步操作 · Toast.promise
            </h4>
            <p class="mb-3 text-xs text-muted">
              先发起模拟请求，再选择成功或失败，观察同一条通知的状态变化。
            </p>
            <div class="flex flex-wrap gap-3">
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
          </div>
        </div>
      </section>

      <section aria-labelledby="page-navigation-title" class="py-8 last:pb-0">
        <h2
          id="page-navigation-title"
          class="heading-bar mb-4 text-lg font-medium"
        >
          页面与导航
        </h2>
        <div class="space-y-8">
          <div
            role="group"
            id="pagination"
            aria-labelledby="pagination-title"
            class="min-w-0 scroll-mt-20"
          >
            <h3 id="pagination-title" class="mb-3 text-sm font-medium">
              分页 · XPagination
            </h3>
            <ExampleControls
              v-model:options="paginationOptions"
              :controls="[]"
              :extra-options="[{ label: '键盘翻页', value: 'keyboard' }]"
              class="mb-6"
            />
            <div class="space-y-6">
              <div class="space-y-3">
                <h4 class="text-sm font-medium">多页与跳转</h4>
                <XPagination
                  v-model:page="page"
                  :total-pages="20"
                  :keyboard="paginationOptions.includes('keyboard')"
                />
                <p class="text-xs text-muted" aria-live="polite">
                  当前页：{{ page }} / 20
                </p>
                <p class="text-xs text-muted">
                  点击省略号跳转到指定页；启用键盘翻页后，在分页内聚焦并使用 ← /
                  →。
                </p>
              </div>
              <div class="space-y-3">
                <h4 class="text-sm font-medium">单页边界</h4>
                <XPagination
                  :page="1"
                  :total-pages="1"
                  aria-label="单页分页示例"
                />
              </div>
            </div>
          </div>

          <div
            role="group"
            id="page"
            aria-labelledby="page-title"
            class="min-w-0 scroll-mt-20"
          >
            <h3 id="page-title" class="mb-3 text-sm font-medium">
              页面 · XPage
            </h3>
            <ExampleControls
              v-model:options="pageOptions"
              :controls="[]"
              :extra-options="[{ label: '显示侧栏', value: 'aside' }]"
              class="mb-4"
            />
            <XPage
              class="mt-4 px-0 sm:px-0"
              :ui="{ aside: 'static h-48 w-28 ps-3 sm:w-48' }"
            >
              <h4 class="mb-3 font-medium">阅读空间</h4>
              <p class="text-sm leading-7 text-muted">
                清晨的列车沿着河流前进，窗外的田野渐渐被山林取代。她在书页间夹好车票，开始读下一章。
              </p>
              <template v-if="pageOptions.includes('aside')" #aside>
                <h4 class="mb-3 text-sm font-medium">章节目录</h4>
                <UScrollArea class="min-h-0 flex-1">
                  <ul class="space-y-3 text-sm text-muted">
                    <li v-for="index in 20" :key="index">第 {{ index }} 章</li>
                  </ul>
                </UScrollArea>
              </template>
            </XPage>
          </div>
        </div>
      </section>
    </div>
  </XPage>
</template>
