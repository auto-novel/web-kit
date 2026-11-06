<script setup lang="ts">
import { XPage, XPageHeader, XScrollArea, XSwitch } from '@novelia/web-kit';
import { ref } from 'vue';

import CodeBlock from './CodeBlock.vue';

const showAside = ref(true);
const chapters = Array.from({ length: 60 }, (_, index) => ({
  title: `第 ${index + 1} 章 · ${['出发前的清晨', '沿着河流向北', '森林深处的灯火', '在旅途中重逢'][index % 4]}`,
  href: `#page-story-${(index % 8) + 1}`,
}));
const storySections = [
  '出发前的清晨',
  '沿着河流向北',
  '森林深处的灯火',
  '在旅途中重逢',
  '雨后的山间小路',
  '抵达陌生的城镇',
  '从书页里找到的线索',
  '写给下一次旅程',
];
const code = `<XPage>
  <XPageHeader
    title="我的收藏"
    description="查看收藏的小说与最近阅读进度。"
  >
    <template #actions>
      <BookshelfActions />
    </template>
  </XPageHeader>

  <BookshelfContent />

  <!-- 不提供 aside 插槽时，正文自动占满可用宽度。 -->
  <template v-if="showAside" #aside>
    <h2 class="py-4 font-medium">收藏夹</h2>
    <XScrollArea class="min-h-0 flex-1">
      <BookshelfMenu />
    </XScrollArea>
  </template>
</XPage>`;
</script>

<template>
  <XPage class="pb-12">
    <XPageHeader
      title="页面 · XPage / XPageHeader"
      description="统一页面限宽与留白，可选右侧辅助栏。此页本身就是一个 XPage，可滚动页面观察右侧目录。"
    >
      <template #actions>
        <label class="flex items-center gap-2 text-sm text-muted">
          <XSwitch v-model="showAside" aria-label="提供侧栏插槽" />
          提供侧栏
        </label>
      </template>
    </XPageHeader>

    <div class="space-y-8">
      <section aria-labelledby="page-layout-behavior">
        <h2 id="page-layout-behavior" class="mb-3 text-base font-medium">
          容器与滚动
        </h2>
        <ul class="list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
          <li>
            页面最大宽度为 1024px（含水平留白），默认上下留白 24px、左右
            12px，sm 断点（640px）起左右为 32px。直接将 XPage
            作为页面根容器，不要再包一层 page-container。
          </li>
          <li>
            提供 aside 插槽时始终显示 320px 右侧栏，不会随容器宽度自动隐藏。
          </li>
          <li>
            正文沿用窗口滚动，不创建整页内部滚动区。右侧栏从顶栏下方贴顶，sticky
            定位并延伸到窗口底部，长目录通过插槽中的 XScrollArea 独立滚动。
          </li>
          <li>
            XPage
            不控制移动端入口，也不会自动生成抽屉。侧栏不自动隐藏，窄屏下正文
            空间会被压缩；需要完整正文宽度时，由业务页面决定是否提供 aside
            插槽。
          </li>
        </ul>
        <p
          class="mt-4 rounded-sm border border-border bg-surface p-3 text-sm leading-6 text-muted"
        >
          试试关闭“提供侧栏”：插槽移除后正文恢复单栏；重新打开后侧栏立即出现，
          调整窗口宽度也不会再自动隐藏。
        </p>
      </section>

      <section aria-labelledby="page-api" class="border-t border-divider pt-6">
        <h2 id="page-api" class="mb-3 text-base font-medium">API</h2>
        <dl class="space-y-4 text-sm leading-6">
          <div>
            <dt class="font-medium">XPage</dt>
            <dd class="text-muted">
              props：ui?: { aside?: XClassValue }。默认插槽放正文；可选 aside
              插槽放辅助内容。页面留白由 XPage 统一提供，aside 的默认样式可用
              ui.aside 补充或覆盖；不提供侧栏位置或 variant 配置，侧栏始终显示。
            </dd>
          </div>
          <div>
            <dt class="font-medium">XPageHeader</dt>
            <dd class="text-muted">
              title: string 为必填标题，description?: string 为可选说明。
              actions 插槽放按钮或开关。根节点为 header，标题为 h1；
              操作区在空间不足时自然换行，默认与正文间隔 24px，无 ui 或 variant
              配置。
            </dd>
          </div>
          <div>
            <dt class="font-medium">组合约定</dt>
            <dd class="text-muted">
              页面上下留白由 XPage 提供，XPageHeader
              只负责标题区与正文的间距。XPage 不接管导航、路由、加载状态或标题；
              XPageHeader 不负责内容限宽。页面内的普通区块标题继续直接使用 h2 /
              h3。
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="page-code" class="border-t border-divider pt-6">
        <h2 id="page-code" class="mb-3 text-base font-medium">基本用法</h2>
        <CodeBlock :code="code" />
      </section>

      <section
        aria-labelledby="page-long-content"
        class="border-t border-divider pt-6"
      >
        <h2 id="page-long-content" class="mb-2 text-base font-medium">
          长正文与侧栏目录
        </h2>
        <p class="mb-6 text-sm leading-7 text-muted">
          以下内容故意超过一屏。滚动窗口时正文正常流动，右侧目录停留在顶栏下方；
          将鼠标移入目录滚动，可以独立浏览更后面的章节。
        </p>
        <article
          v-for="(title, index) in storySections"
          :id="`page-story-${index + 1}`"
          :key="title"
          class="mb-8 scroll-mt-20 space-y-4 text-sm leading-8 last:mb-0"
        >
          <h3 class="text-base font-medium">
            第 {{ index + 1 }} 章 · {{ title }}
          </h3>
          <p>
            清晨的车站还没有多少旅人。她把地图折好，放进随身携带的旧书里，
            再检查了一遍口袋中的车票。今天要去的地方没有熟悉的街道，
            只有朋友信中提到的一座石桥，和桥边那间总是很晚才关门的书店。
          </p>
          <p>
            列车沿着河流缓缓前进，窗外的田野逐渐被山林取代。
            她在笔记本上记下路过的小站，把每个名字都当作下一次旅程的约定。
            偶尔有阳光越过树梢照在书页上，那些曾经读过的句子，
            便和眼前的风景一起，有了与记忆中不同的颜色。
          </p>
        </article>
      </section>
    </div>

    <template v-if="showAside" #aside>
      <div class="shrink-0 border-b border-divider py-4">
        <h2 class="text-base font-medium">章节目录</h2>
        <p class="mt-1 text-xs leading-6 text-muted">
          长列表独立滚动，正文仍滚动窗口。
        </p>
      </div>
      <XScrollArea class="min-h-0 flex-1" :ui="{ viewport: 'pr-3' }">
        <nav aria-label="长正文示例章节" class="py-2">
          <ol class="space-y-1">
            <li v-for="(chapter, index) in chapters" :key="index">
              <a
                :href="chapter.href"
                :class="[
                  'block rounded-sm p-2 text-sm leading-6 text-muted',
                  'hover:bg-hover hover:text-ink',
                  'focus-visible:outline-2 focus-visible:outline-primary',
                ]"
              >
                {{ chapter.title }}
              </a>
            </li>
          </ol>
        </nav>
      </XScrollArea>
    </template>
  </XPage>
</template>
