<script setup lang="ts">
import { XButton, XInput, XPagination } from '@novelia/web-kit';
import { ref, useTemplateRef } from 'vue';
import ComponentPage from './ComponentPage.vue';

const page = ref(2);
const scopedPage = ref(2);
const keyword = ref('在这里用左右键移动光标，不会翻页');
const listRegion = useTemplateRef<HTMLElement>('listRegion');
const code = `<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
const page = ref(1);
const listRegion = useTemplateRef<HTMLElement>('listRegion');
<\/script>

<div ref="listRegion" tabindex="0" aria-label="列表">
  <!-- 列表、搜索框等内容 -->
  <XPagination v-model:page="page" :total-pages="20" :keyboard="listRegion" />
</div>`;
</script>

<template>
  <ComponentPage
    description="通过 v-model:page 控制页码，支持跳页面板、响应式外观和可选的左右方向键。"
    :code="code"
  >
    <section
      aria-labelledby="test-pagination"
      class="border-t border-divider pt-6"
    >
      <h2 id="test-pagination" class="mb-2 font-medium">分页 · XPagination</h2>
      <p class="mb-4 text-sm text-muted">
        检查上一页、下一页和页码切换；焦点在分页内时可用左右方向键翻页。点击省略号打开跳转到指定页的面板，支持回车确认。
      </p>
      <XPagination v-model:page="page" :total-pages="20" keyboard />
      <p class="mt-3 text-xs text-muted">当前页：{{ page }} / 20</p>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">列表区域方向键翻页</h2>
      <p id="pagination-scope-help" class="mb-4 text-sm text-muted">
        点击“聚焦列表”或用 Tab 聚焦列表区域，再按 ← / →
        翻页。列表按钮获得焦点时也可翻页；搜索框内仅移动光标，区域外不触发翻页。首末页不循环，按住方向键不会连续翻页。
      </p>
      <XButton
        color="neutral"
        variant="outline"
        size="sm"
        class="mb-4"
        @click="listRegion?.focus()"
      >
        聚焦列表
      </XButton>
      <div
        ref="listRegion"
        tabindex="0"
        role="region"
        aria-label="方向键翻页测试列表"
        aria-describedby="pagination-scope-help"
        class="rounded-sm border border-border focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div class="space-y-3 p-4">
          <label for="pagination-search" class="block text-sm">
            搜索框（保留方向键）
          </label>
          <XInput id="pagination-search" v-model="keyword" />
          <ul class="space-y-2">
            <li v-for="index in 3" :key="index">
              <XButton color="neutral" variant="ghost" size="sm">
                列表条目 {{ (scopedPage - 1) * 3 + index }}
              </XButton>
            </li>
          </ul>
          <p class="text-xs text-muted" aria-live="polite">
            当前页：{{ scopedPage }} / 5
          </p>
        </div>
        <XPagination
          v-model:page="scopedPage"
          :total-pages="5"
          :keyboard="listRegion"
        />
      </div>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">接口与交互</h2>
      <p class="text-sm leading-6 text-muted">
        页码从 1 开始。totalPages 表示总页数，不是记录数。keyboard
        默认关闭：true 仅分页内生效，传入容器元素扩展到该容器，传 'window'
        则在页面级生效。输入框、可编辑区域、方向键控件、浮层和文本选择会保留原有操作；自定义控件可添加
        data-pagination-keyboard-ignore 排除。容器需自行设置 tabindex
        以支持聚焦，组件不会抢占列表焦点。点击省略号打开跳页面板。
      </p>
    </section>
  </ComponentPage>
</template>
