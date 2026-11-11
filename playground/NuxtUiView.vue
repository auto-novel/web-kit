<script setup lang="ts">
import { XPage, useDragScroll } from '@novelia/web-kit';
import UAlert from '@nuxt/ui/components/Alert.vue';
import UAvatar from '@nuxt/ui/components/Avatar.vue';
import UBadge from '@nuxt/ui/components/Badge.vue';
import UButton from '@nuxt/ui/components/Button.vue';
import UCard from '@nuxt/ui/components/Card.vue';
import UCheckbox from '@nuxt/ui/components/Checkbox.vue';
import UFormField from '@nuxt/ui/components/FormField.vue';
import UInput from '@nuxt/ui/components/Input.vue';
import UModal from '@nuxt/ui/components/Modal.vue';
import UPageHeader from '@nuxt/ui/components/PageHeader.vue';
import UProgress from '@nuxt/ui/components/Progress.vue';
import URadioGroup from '@nuxt/ui/components/RadioGroup.vue';
import USelect from '@nuxt/ui/components/Select.vue';
import UScrollArea from '@nuxt/ui/components/ScrollArea.vue';
import USkeleton from '@nuxt/ui/components/Skeleton.vue';
import USlider from '@nuxt/ui/components/Slider.vue';
import USwitch from '@nuxt/ui/components/Switch.vue';
import UTabs from '@nuxt/ui/components/Tabs.vue';
import USlideover from '@nuxt/ui/components/Slideover.vue';
import UTextarea from '@nuxt/ui/components/Textarea.vue';
import UTooltip from '@nuxt/ui/components/Tooltip.vue';
import { useToast } from '@nuxt/ui/composables';
import { ref, useTemplateRef } from 'vue';

const horizontalScroll = useTemplateRef('horizontalScroll');
useDragScroll(() => horizontalScroll.value?.$el, {
  orientation: 'horizontal',
  inertia: true,
});

const toast = useToast();
const text = ref('Novelia');
const description = ref('共享主题下的 Nuxt UI 组件。');
const selected = ref('novel');
const open = ref(false);
const slideoverOpen = ref(false);
const options = [
  { label: '小说', value: 'novel' },
  { label: '论坛', value: 'forum' },
  { label: '账号', value: 'account' },
];
const variants = [
  'solid',
  'outline',
  'soft',
  'subtle',
  'ghost',
  'link',
] as const;
const colors = [
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'error',
  'neutral',
] as const;
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const subscribed = ref(true);
const notifications = ref(true);
const visibility = ref('public');
const progress = ref(60);
const visibilityOptions = [
  { label: '公开', value: 'public', description: '所有人都可以阅读' },
  { label: '私密', value: 'private', description: '仅自己可见' },
];
const tabs = [
  { label: '概览', content: '查看作品简介、更新状态和阅读进度。' },
  { label: '章节', content: '章节列表会展示在这里，可继续阅读最新章节。' },
  { label: '评论', content: '与读者交流，分享阅读感受。' },
  { label: '已禁用', disabled: true },
];
</script>

<template>
  <XPage>
    <UPageHeader
      title="Nuxt组件"
      description="直接使用 Nuxt UI 组件，共享 web-kit 的语义色、字号、圆角及浅色 / 深色主题。"
    />

    <div class="min-w-0 divide-y divide-divider">
      <section class="py-8 first:pt-0 last:pb-0">
        <h2 class="heading-bar text-lg font-medium">按钮</h2>
        <p
          id="nuxt-button-matrix-description"
          class="mt-1 mb-4 text-sm text-muted"
        >
          Variant × Color 完整组合；可悬停、点击或使用 Tab
          查看交互状态。窄屏下可横向滚动。
        </p>
        <div
          class="overflow-x-auto rounded-sm border border-divider focus-visible:outline-2 focus-visible:outline-primary"
          role="region"
          aria-label="按钮样式对照表"
          aria-describedby="nuxt-button-matrix-description"
          tabindex="0"
        >
          <table class="w-full border-collapse text-sm">
            <caption class="sr-only">
              6 种按钮 Variant 与 7 种 Color 的样式组合
            </caption>
            <thead>
              <tr class="border-b border-divider bg-embedded">
                <th scope="col" class="p-3 text-left font-medium">
                  Variant / Color
                </th>
                <th
                  v-for="color in colors"
                  :key="color"
                  scope="col"
                  class="p-3 text-center font-medium"
                >
                  {{ color }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="variant in variants"
                :key="variant"
                class="border-b border-divider last:border-b-0"
              >
                <th scope="row" class="p-3 text-left font-medium">
                  {{ variant }}
                </th>
                <td
                  v-for="color in colors"
                  :key="color"
                  class="p-3 text-center"
                >
                  <UButton
                    :variant="variant"
                    :color="color"
                    :aria-label="`${variant} / ${color} 按钮`"
                  >
                    {{ color }}
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 class="mb-3 text-sm font-medium">尺寸 · Size</h3>
            <div class="flex flex-wrap items-center gap-3">
              <UButton v-for="size in sizes" :key="size" :size="size">
                {{ size }}
              </UButton>
            </div>
          </div>
          <div>
            <h3 class="mb-3 text-sm font-medium">图标与状态</h3>
            <div class="flex flex-wrap items-center gap-3">
              <UButton icon="i-lucide-plus">新建</UButton>
              <UButton trailing-icon="i-lucide-arrow-right" variant="outline">
                下一步
              </UButton>
              <UButton
                icon="i-lucide-heart"
                color="neutral"
                variant="soft"
                square
                aria-label="收藏"
              />
              <UButton disabled>禁用</UButton>
              <UButton loading>加载中</UButton>
            </div>
          </div>
        </div>
      </section>

      <section class="py-8 first:pt-0 last:pb-0">
        <h2 class="heading-bar mb-4 text-lg font-medium">输入与选择</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="flex flex-col gap-3">
            <UInput
              v-model="text"
              aria-label="名称"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template v-if="text" #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  square
                  size="xs"
                  aria-label="清空名称"
                  @click="text = ''"
                >
                  ×
                </UButton>
              </template>
            </UInput>
            <USelect
              v-model="selected"
              :items="options"
              aria-label="应用"
              class="w-full"
            />
            <UInput
              model-value="校验失败"
              color="error"
              highlight
              aria-label="错误输入框"
              class="w-full"
            />
          </div>
          <div>
            <UTextarea
              v-model="description"
              :maxlength="200"
              :rows="4"
              autoresize
              aria-label="简介"
              aria-describedby="nuxt-description-count"
              class="w-full"
            />
            <p
              id="nuxt-description-count"
              class="mt-1 text-xs text-muted"
              aria-live="polite"
            >
              {{ description.length }} / 200
            </p>
          </div>
        </div>
      </section>

      <section class="py-8 first:pt-0 last:pb-0">
        <h2 class="heading-bar mb-4 text-lg font-medium">选择控件</h2>
        <div class="grid gap-6 md:grid-cols-3">
          <div class="space-y-3">
            <h3 class="text-sm font-medium">Checkbox · 复选框</h3>
            <UCheckbox
              v-model="subscribed"
              label="订阅作品更新"
              description="有新章节时通知我"
            />
            <UCheckbox :model-value="'indeterminate'" label="部分选中" />
            <UCheckbox disabled label="不可选" />
          </div>
          <div class="space-y-3">
            <h3 class="text-sm font-medium">Switch · 开关</h3>
            <USwitch v-model="notifications" label="接收通知" />
            <p class="text-xs text-muted" aria-live="polite">
              通知已{{ notifications ? '开启' : '关闭' }}
            </p>
            <USwitch disabled label="不可切换" />
          </div>
          <URadioGroup
            v-model="visibility"
            legend="RadioGroup · 可见范围"
            :items="visibilityOptions"
          />
        </div>
        <div
          class="mt-6 grid gap-6 border-t border-divider pt-6 md:grid-cols-2"
        >
          <UFormField label="Slider · 阅读进度" :hint="`${progress}%`">
            <USlider
              v-model="progress"
              :min="0"
              :max="100"
              :step="5"
              tooltip
              aria-label="阅读进度"
              class="mt-2"
            />
          </UFormField>
          <div class="space-y-3">
            <h3 class="text-sm font-medium">Progress · 进度条</h3>
            <UProgress
              :model-value="progress"
              :max="100"
              aria-label="当前阅读进度"
            />
            <UProgress color="neutral" aria-label="正在加载" />
          </div>
        </div>
      </section>

      <section class="py-8 first:pt-0 last:pb-0">
        <h2 class="heading-bar mb-4 text-lg font-medium">信息展示</h2>
        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-4">
            <h3 class="text-sm font-medium">Badge · 语义色徽章</h3>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="color in colors"
                :key="color"
                :color="color"
                variant="subtle"
              >
                {{ color }}
              </UBadge>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge variant="solid">solid</UBadge>
              <UBadge variant="outline">outline</UBadge>
              <UBadge variant="soft">soft</UBadge>
              <UBadge variant="subtle">subtle</UBadge>
            </div>
          </div>
          <div class="space-y-4">
            <h3 class="text-sm font-medium">Avatar · 头像与占位</h3>
            <div class="flex flex-wrap items-center gap-3">
              <UAvatar
                v-for="size in sizes"
                :key="size"
                alt="Novelia"
                :size="size"
              />
              <UAvatar
                icon="i-lucide-user"
                size="lg"
                aria-label="默认用户头像"
              />
            </div>
          </div>
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="提示信息"
            description="组件共用语义色与明暗主题，切换主题即可对照。"
          />
          <UAlert
            color="success"
            variant="subtle"
            icon="i-lucide-circle-check"
            title="保存成功"
            description="作品信息已更新，可以继续编辑。"
          />
          <UAlert
            color="warning"
            variant="outline"
            icon="i-lucide-triangle-alert"
            title="请注意"
            description="发布前请检查章节内容是否完整。"
          />
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="操作失败"
            description="网络暂时不可用，请稍后重试。"
          />
        </div>
      </section>

      <section class="py-8 first:pt-0 last:pb-0">
        <h2 class="heading-bar mb-4 text-lg font-medium">卡片与标签页</h2>
        <div class="grid items-start gap-6 md:grid-cols-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="font-medium">Card · 作品卡片</h3>
                <UBadge color="success" variant="soft">连载中</UBadge>
              </div>
            </template>
            <p class="text-sm text-muted">
              卡片提供 header、正文与 footer 区域，用于组织相关信息和操作。
            </p>
            <template #footer>
              <UButton variant="soft" icon="i-lucide-book-open">
                继续阅读
              </UButton>
            </template>
          </UCard>
          <div class="space-y-6">
            <div>
              <h3 class="mb-3 text-sm font-medium">Tabs · 标签页</h3>
              <UTabs
                :items="tabs"
                variant="link"
                :ui="{ content: 'pt-3 text-sm text-muted' }"
              />
            </div>
            <div>
              <h3 class="mb-3 text-sm font-medium">Skeleton · 加载占位</h3>
              <div
                class="flex items-center gap-3"
                role="status"
                aria-label="内容加载中"
              >
                <USkeleton class="size-10 shrink-0 rounded-full" />
                <div class="w-full space-y-2">
                  <USkeleton class="h-4 w-2/3" />
                  <USkeleton class="h-3 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="scroll-area"
        aria-labelledby="scroll-title"
        class="min-w-0 scroll-mt-20 py-8"
      >
        <h2 id="scroll-title" class="heading-bar mb-4 text-lg font-medium">
          滚动区域 · UScrollArea
        </h2>
        <div class="grid min-w-0 gap-6 md:grid-cols-2">
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">纵向</h3>
            <UScrollArea class="h-48 w-full" :ui="{ viewport: 'pr-4' }">
              <ul class="space-y-3 text-sm">
                <li v-for="index in 20" :key="index">
                  第 {{ index }} 项 · 阅读动态
                </li>
              </ul>
            </UScrollArea>
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="flex items-center gap-1 text-sm font-medium">
              横向 · 惯性拖动
              <UTooltip
                text="web-kit 扩展能力：通过 useDragScroll 实现拖拽与惯性滚动，非 UScrollArea 原生能力。"
              >
                <UButton
                  icon="i-lucide-info"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="了解拖拽滚动扩展能力"
                />
              </UTooltip>
            </h3>
            <UScrollArea
              ref="horizontalScroll"
              orientation="horizontal"
              class="h-32 w-full"
            >
              <div class="flex w-max gap-4 pb-4">
                <div
                  v-for="index in 8"
                  :key="index"
                  class="flex h-24 w-32 shrink-0 items-center justify-center bg-embedded text-sm"
                >
                  章节 {{ index }}
                </div>
              </div>
            </UScrollArea>
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">双向 · 原生滚动</h3>
            <div
              class="h-48 w-full overflow-auto"
              tabindex="0"
              aria-label="双向滚动内容"
            >
              <div class="w-160 space-y-3 pr-4 pb-4 text-sm">
                <p v-for="index in 16" :key="index">
                  第 {{ index }} 行 ·
                  沿着河流向北，穿过森林与山谷，前往下一座陌生的城镇。
                </p>
              </div>
            </div>
          </div>
          <div class="min-w-0 space-y-3">
            <h3 class="text-sm font-medium">短内容 · 自适应高度</h3>
            <UScrollArea class="max-h-48 w-full">
              <p class="text-sm">只有一行的阅读动态。</p>
            </UScrollArea>
          </div>
        </div>
      </section>

      <section class="py-8 first:pt-0 last:pb-0">
        <h2 class="heading-bar mb-4 text-lg font-medium">浮层与反馈</h2>
        <div class="flex flex-wrap gap-3">
          <UModal
            v-model:open="open"
            title="Nuxt UI 弹窗"
            description="使用共享主题的 Nuxt UI 组件。"
            :ui="{ content: 'sm:max-w-xl' }"
          >
            <UButton color="neutral" variant="outline">打开弹窗</UButton>
            <template #body><p>共享的背景、语义色及浮层风格。</p></template>
            <template #footer>
              <UButton @click="open = false">关闭</UButton>
            </template>
          </UModal>
          <USlideover
            v-model:open="slideoverOpen"
            title="Nuxt UI 侧边栏"
            description="从右侧打开辅助面板，使用遮罩、Escape 或关闭按钮退出。"
            side="right"
            :ui="{ content: 'w-full max-w-sm' }"
          >
            <UButton color="neutral" variant="outline">打开侧边栏</UButton>
            <template #body>
              <div class="space-y-4">
                <p>正文放在 body 插槽，默认插槽按钮作为触发器。</p>
                <UInput v-model="text" aria-label="侧边栏名称" class="w-full" />
              </div>
            </template>
            <template #footer>
              <UButton @click="slideoverOpen = false">完成并关闭</UButton>
            </template>
          </USlideover>
          <UButton
            variant="soft"
            @click="
              toast.add({
                title: 'Nuxt UI 通知',
                description: '与 web-kit 共用浮层底色和阴影',
                color: 'success',
              })
            "
          >
            显示通知
          </UButton>
          <UTooltip text="共用 web-kit 的浮层背景、圆角与阴影">
            <UButton color="neutral" variant="ghost">悬停提示</UButton>
          </UTooltip>
        </div>
      </section>
    </div>
  </XPage>
</template>
